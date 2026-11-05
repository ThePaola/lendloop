import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

type OverdueLoan = {
  loanId: Id<"loans">;
  toolName: string;
  borrowerFirstName: string;
  borrowerEmail: string;
  endDate: string;
  daysOverdue: number;
};

const firstName = (name?: string) => name?.split(" ")[0] || "Neighbor";

export const listOverdue = internalQuery({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_status_end", (q) => q.eq("status", "approved").lt("endDate", today))
      .take(500);

    const result = [];
    for (const loan of loans) {
      const key = `${loan._id}:${today}`;
      const existing = await ctx.db.query("reminders").withIndex("by_key", (q) => q.eq("idempotencyKey", key)).unique();
      if (existing?.status === "sent") continue; // já lembrado hoje

      const [tool, borrower] = await Promise.all([ctx.db.get(loan.toolId), ctx.db.get(loan.borrowerId)]);
      if (!borrower?.email) continue;
      result.push({
        loanId: loan._id,
        toolName: tool?.name ?? "a tool",
        borrowerFirstName: firstName(borrower.name),
        borrowerEmail: borrower.email,
        endDate: loan.endDate,
        daysOverdue: Math.round((Date.parse(today) - Date.parse(loan.endDate)) / 86_400_000),
      });
    }
    return result;
  },
});

export const record = internalMutation({
  args: {
    loanId: v.string(),
    reminderDate: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    n8nExecutionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const loanId = ctx.db.normalizeId("loans", args.loanId);
    if (!loanId || !(await ctx.db.get(loanId))) return { ok: false as const, reason: "not_found" };

    const idempotencyKey = `${loanId}:${args.reminderDate}`;
    const existing = await ctx.db
      .query("reminders")
      .withIndex("by_key", (q) => q.eq("idempotencyKey", idempotencyKey))
      .unique();

    if (existing) {
      if (existing.status === "sent" || existing.status === args.status) {
        return { ok: true as const, duplicate: true };
      }
      await ctx.db.patch(existing._id, { status: args.status, n8nExecutionId: args.n8nExecutionId });
      return { ok: true as const, duplicate: false };
    }

    await ctx.db.insert("reminders", {
      idempotencyKey,
      loanId,
      reminderDate: args.reminderDate,
      status: args.status,
      n8nExecutionId: args.n8nExecutionId,
      createdAt: Date.now(),
    });
    return { ok: true as const, duplicate: false };
  },
});