import { internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { shiftDays, todayUtc } from "./lib/dates";

export const overdueLoan = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(2);
    if (users.length < 2) throw new ConvexError({ code: "NEED_TWO_USERS" });
    const [owner, borrower] = users;
    const today = todayUtc();

    const toolId = await ctx.db.insert("tools", {
      ownerId: owner._id,
      name: "Camping tent (seed)",
      category: "camping",
      condition: "good",
      description: "Seeded to test overdue reminders",
      createdAt: Date.now(),
    });
    const loanId = await ctx.db.insert("loans", {
      toolId,
      ownerId: owner._id,
      borrowerId: borrower._id,
      startDate: shiftDays(today, -7),
      endDate: shiftDays(today, -2),
      status: "approved",
      decidedAt: Date.now(),
    });
    return { toolId, loanId };
  },
});