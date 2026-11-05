import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { requireUser, assertSelf } from "./lib/auth";
import { isIsoDate, overlaps, shiftDays, todayUtc } from "./lib/dates";

const MAX_DAYS = 30;
const DAY_MS = 86_400_000;

export async function assertNoOverlap(
  ctx: QueryCtx,
  toolId: Id<"tools">,
  startDate: string,
  endDate: string,
  ignoreLoanId?: Id<"loans">,
) {
  const loans = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).collect();
  const clash = loans.some(
    (l) => l._id !== ignoreLoanId && l.status === "approved" && overlaps(startDate, endDate, l.startDate, l.endDate),
  );
  if (clash) throw new ConvexError({ code: "DATES_UNAVAILABLE" });
}

async function getLoanOrThrow(ctx: QueryCtx, loanId: Id<"loans">) {
  const loan = await ctx.db.get(loanId);
  if (!loan) throw new ConvexError({ code: "NOT_FOUND" });
  return loan;
}

// Devolve só o que as telas precisam: primeiro nome da outra pessoa, sem email.
async function present(ctx: QueryCtx, loans: Doc<"loans">[], other: "ownerId" | "borrowerId") {
  return Promise.all(
    loans.map(async (l) => {
      const tool = await ctx.db.get(l.toolId);
      const person = await ctx.db.get(l[other]);
      return {
        _id: l._id,
        status: l.status,
        startDate: l.startDate,
        endDate: l.endDate,
        toolName: tool?.name ?? "Removed tool",
        otherFirstName: person?.name.split(" ")[0] ?? "Neighbor",
      };
    }),
  );
}

export const request = mutation({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { toolId, startDate, endDate }) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool) throw new ConvexError({ code: "NOT_FOUND" });
    if (tool.ownerId === me._id) throw new ConvexError({ code: "OWN_TOOL" });

    if (!isIsoDate(startDate) || !isIsoDate(endDate) || startDate > endDate) {
      throw new ConvexError({ code: "INVALID_DATES" });
    }
    // 1 dia de tolerância: o servidor usa UTC e o usuário pode estar atrás (ex.: Brasil à noite)
    if (startDate < shiftDays(todayUtc(), -1)) throw new ConvexError({ code: "INVALID_DATES" });
    const days = (Date.parse(endDate) - Date.parse(startDate)) / DAY_MS + 1;
    if (days > MAX_DAYS) throw new ConvexError({ code: "TOO_LONG" });

    const mine = await ctx.db.query("loans").withIndex("by_borrower", (q) => q.eq("borrowerId", me._id)).collect();
    if (mine.some((l) => l.toolId === toolId && l.status === "pending")) {
      throw new ConvexError({ code: "ALREADY_REQUESTED" });
    }
    await assertNoOverlap(ctx, toolId, startDate, endDate);

    const loanId = await ctx.db.insert("loans", {
      toolId,
      ownerId: tool.ownerId,
      borrowerId: me._id,
      startDate,
      endDate,
      status: "pending",
    });
    // Etapa 5: await enqueueLoanEvent(ctx, loanId, "request_created");
    return loanId;
  },
});

export const cancel = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const me = await requireUser(ctx);
    const loan = await getLoanOrThrow(ctx, loanId);
    assertSelf(me._id, loan.borrowerId);
    if (loan.status !== "pending") throw new ConvexError({ code: "INVALID_STATE" });
    await ctx.db.patch(loanId, { status: "cancelled", decidedAt: Date.now() });
    // Etapa 5: await enqueueLoanEvent(ctx, loanId, "status_changed");
  },
});

export const decide = mutation({
  args: { loanId: v.id("loans"), decision: v.union(v.literal("approved"), v.literal("declined")) },
  handler: async (ctx, { loanId, decision }) => {
    const me = await requireUser(ctx);
    const loan = await getLoanOrThrow(ctx, loanId);
    assertSelf(me._id, loan.ownerId);
    if (loan.status !== "pending") throw new ConvexError({ code: "INVALID_STATE" });
    if (decision === "approved") {
      await assertNoOverlap(ctx, loan.toolId, loan.startDate, loan.endDate, loan._id);
    }
    await ctx.db.patch(loanId, { status: decision, decidedAt: Date.now() });
    // Etapa 5: await enqueueLoanEvent(ctx, loanId, "status_changed");
  },
});

export const markReturned = mutation({
  args: { loanId: v.id("loans") },
  handler: async (ctx, { loanId }) => {
    const me = await requireUser(ctx);
    const loan = await getLoanOrThrow(ctx, loanId);
    assertSelf(me._id, loan.ownerId);
    if (loan.status !== "approved") throw new ConvexError({ code: "INVALID_STATE" });
    await ctx.db.patch(loanId, { status: "returned", returnedAt: Date.now() });
    // Etapa 5: await enqueueLoanEvent(ctx, loanId, "status_changed");
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const loans = await ctx.db.query("loans").withIndex("by_borrower", (q) => q.eq("borrowerId", me._id)).order("desc").collect();
    return present(ctx, loans, "ownerId");
  },
});

export const incoming = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const loans = await ctx.db.query("loans").withIndex("by_owner", (q) => q.eq("ownerId", me._id)).order("desc").collect();
    return present(ctx, loans, "borrowerId");
  },
});