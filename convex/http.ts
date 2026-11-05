import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { hmacVerify } from "./lib/hmac";
import { isIsoDate, todayUtc } from "./lib/dates";

const MAX_BODY_BYTES = 10_000;

async function verifyFromN8n(req: Request, rawBody: string) {
  const secret = process.env.N8N_TO_CONVEX_SECRET;
  const ts = req.headers.get("x-lendloop-timestamp");
  const sig = req.headers.get("x-lendloop-signature");
  if (!secret || !ts || !sig?.startsWith("sha256=")) return false;
  if (!/^\d+$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const path = new URL(req.url).pathname;
  return hmacVerify(secret, `${ts}.${req.method}.${path}.${rawBody}`, sig.slice(7));
}

type ReminderStatusInput = {
  loanId: string;
  reminderDate: string;
  status: "sent" | "failed";
  n8nExecutionId?: string;
};

function parseReminderStatus(input: unknown): ReminderStatusInput | null {
  if (typeof input !== "object" || input === null) return null;
  const { loanId, reminderDate, status, n8nExecutionId } = input as Record<string, unknown>;
  if (typeof loanId !== "string" || loanId.length > 64) return null;
  if (typeof reminderDate !== "string" || !isIsoDate(reminderDate)) return null;
  if (status !== "sent" && status !== "failed") return null;
  if (n8nExecutionId !== undefined && (typeof n8nExecutionId !== "string" || n8nExecutionId.length > 64)) return null;
  return { loanId, reminderDate, status, n8nExecutionId: n8nExecutionId as string | undefined };
}

const http = httpRouter();

http.route({
  path: "/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    if (!(await verifyFromN8n(req, ""))) return new Response("unauthorized", { status: 401 });
    const today = todayUtc();
    const loans = await ctx.runQuery(internal.reminders.listOverdue, { today });
    return Response.json({ asOf: today, loans });
  }),
});

http.route({
  path: "/reminder-status",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return new Response("payload too large", { status: 413 });
    if (!(await verifyFromN8n(req, raw))) return new Response("unauthorized", { status: 401 });

    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      return new Response("bad json", { status: 400 });
    }
    const parsed = parseReminderStatus(input);
    if (!parsed) return new Response("bad request", { status: 400 });

    const result = await ctx.runMutation(internal.reminders.record, parsed);
    if (!result.ok) return new Response("not found", { status: 404 });
    return Response.json(result);
  }),
});

export default http;