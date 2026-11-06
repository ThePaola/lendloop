import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { hmacHex } from "./lib/hmac";

const MAX_ATTEMPTS = 5;
const backoffMs = (attempt: number) => Math.min(30_000 * 2 ** (attempt - 1), 15 * 60_000); // 30s, 1m, 2m, 4m
const firstName = (name?: string) => name?.split(" ")[0] || "Neighbor";

export async function enqueueLoanEvent(
  ctx: MutationCtx,
  loan: Doc<"loans">,
  type: "request_created" | "status_changed",
  recipient: "owner" | "borrower",
) {
  const eventId = crypto.randomUUID();
  await ctx.db.insert("notificationEvents", {
    eventId,
    loanId: loan._id,
    type,
    recipient,
    loanStatus: loan.status,
    status: "queued",
    attempts: 0,
  });
  await ctx.scheduler.runAfter(0, internal.notifications.deliver, { eventId });
}

export const buildPayload = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db
      .query("notificationEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .unique();
    if (!event || event.status !== "queued") return { ok: false as const, reason: "not_queued" };

    const loan = await ctx.db.get(event.loanId);
    if (!loan) return { ok: false as const, reason: "missing_data" };
    const tool = await ctx.db.get(loan.toolId);
    const recipientId = event.recipient === "owner" ? loan.ownerId : loan.borrowerId;
    const counterpartId = event.recipient === "owner" ? loan.borrowerId : loan.ownerId;
    const [recipient, counterpart] = await Promise.all([ctx.db.get(recipientId), ctx.db.get(counterpartId)]);
    if (!recipient?.email) return { ok: false as const, reason: "missing_data" };

    return {
      ok: true as const,
      payload: {
        eventId: event.eventId,
        type: event.type,
        occurredAt: new Date(event._creationTime).toISOString(),
        recipient: { firstName: firstName(recipient.name), email: recipient.email },
        loan: { id: loan._id, status: event.loanStatus, startDate: loan.startDate, endDate: loan.endDate },
        tool: { name: tool?.name ?? "a tool" },
        counterpartFirstName: firstName(counterpart?.name),
      },
    };
  },
});

export const markSent = internalMutation({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.query("notificationEvents").withIndex("by_eventId", (q) => q.eq("eventId", eventId)).unique();
    if (!event) return;
    await ctx.db.patch(event._id, { status: "sent", sentAt: Date.now(), attempts: event.attempts + 1, lastError: undefined });
  },
});

export const markAttemptFailed = internalMutation({
  args: { eventId: v.string(), error: v.string(), final: v.optional(v.boolean()) },
  handler: async (ctx, { eventId, error, final }) => {
    const event = await ctx.db.query("notificationEvents").withIndex("by_eventId", (q) => q.eq("eventId", eventId)).unique();
    if (!event) return MAX_ATTEMPTS;
    const attempts = event.attempts + 1;
    const giveUp = final || attempts >= MAX_ATTEMPTS;
    await ctx.db.patch(event._id, { attempts, lastError: error, status: giveUp ? "failed" : "queued" });
    return giveUp ? MAX_ATTEMPTS : attempts;
  },
});

export const deliver = internalAction({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    const secret = process.env.CONVEX_TO_N8N_SECRET;
    const url = process.env.N8N_LOAN_EVENTS_WEBHOOK_URL;
    if (!secret || !url) {
      await ctx.runMutation(internal.notifications.markAttemptFailed, { eventId, error: "missing_config", final: true });
      return;
    }

    const built = await ctx.runQuery(internal.notifications.buildPayload, { eventId });
    if (!built.ok) {
      if (built.reason === "missing_data") {
        await ctx.runMutation(internal.notifications.markAttemptFailed, { eventId, error: "missing_data", final: true });
      }
      return;
    }

    const body = JSON.stringify(built.payload);
    const ts = Math.floor(Date.now() / 1000).toString();
    const signature = await hmacHex(secret, `${ts}.${body}`);

    let error: string | null = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lendloop-timestamp": ts,
          "x-lendloop-signature": `sha256=${signature}`,
          "x-lendloop-event-id": eventId,
        },
        body,
        signal: controller.signal,
      });
      if (!res.ok) error = `http_${res.status}`;
    } catch {
      error = "network_error";
    } finally {
      clearTimeout(timeout);
    }

    if (!error) {
      await ctx.runMutation(internal.notifications.markSent, { eventId });
      return;
    }
    const attempts = await ctx.runMutation(internal.notifications.markAttemptFailed, { eventId, error });
    if (attempts < MAX_ATTEMPTS) {
      await ctx.scheduler.runAfter(backoffMs(attempts), internal.notifications.deliver, { eventId });
    }
  },
});