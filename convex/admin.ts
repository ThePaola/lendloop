import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { enqueueLoanEvent } from "./notifications";

export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").order("desc").take(200);
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      trustedLender: u.trustedLender,
    }));
  },
});

export const listLoans = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db.query("loans").order("desc").paginate(paginationOpts);
    const page = await Promise.all(
      result.page.map(async (l) => {
        const [tool, owner, borrower] = await Promise.all([
          ctx.db.get(l.toolId),
          ctx.db.get(l.ownerId),
          ctx.db.get(l.borrowerId),
        ]);
        return {
          _id: l._id,
          status: l.status,
          startDate: l.startDate,
          endDate: l.endDate,
          toolName: tool?.name ?? "Removed tool",
          ownerName: owner?.name ?? "Unknown",
          borrowerName: borrower?.name ?? "Unknown",
        };
      }),
    );
    return { ...result, page };
  },
});

export const removeTool = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    await requireAdmin(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool) throw new ConvexError({ code: "NOT_FOUND" });
    const loans = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).collect();
    if (loans.some((l) => l.status === "approved")) throw new ConvexError({ code: "HAS_ACTIVE_LOANS" });
    for (const l of loans) {
      if (l.status === "pending") {
        await ctx.db.patch(l._id, { status: "cancelled", decidedAt: Date.now() });
        await enqueueLoanEvent(ctx, (await ctx.db.get(l._id))!, "status_changed", "borrower");
      }
    }
    await ctx.db.delete(toolId);
  },
});

export const setTrustedLender = mutation({
  args: { userId: v.id("users"), trusted: v.boolean() },
  handler: async (ctx, { userId, trusted }) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ code: "NOT_FOUND" });
    await ctx.db.patch(userId, { trustedLender: trusted });
  },
});