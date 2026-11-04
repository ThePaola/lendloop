import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { category as categoryValidator } from "./schema";
import { requireUser, assertSelf } from "./lib/auth";
import { todayUtc } from "./lib/dates";

const conditionValidator = v.union(v.literal("new"), v.literal("good"), v.literal("worn"));

function cleanText(name: string, description: string) {
  const n = name.trim();
  const d = description.trim();
  if (n.length < 2 || n.length > 80) throw new ConvexError({ code: "INVALID_INPUT", field: "name" });
  if (d.length > 500) throw new ConvexError({ code: "INVALID_INPUT", field: "description" });
  return { name: n, description: d };
}

async function isAvailableToday(ctx: QueryCtx, toolId: Id<"tools">) {
  const today = todayUtc();
  const loans = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).collect();
  return !loans.some((l) => l.status === "approved" && l.startDate <= today && today <= l.endDate);
}

// Público: só nome, categoria e disponibilidade. Nada do dono.
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const tools = await ctx.db.query("tools").order("desc").take(100);
    return Promise.all(
      tools.map(async (t) => ({
        _id: t._id,
        name: t.name,
        category: t.category,
        available: await isAvailableToday(ctx, t._id),
      })),
    );
  },
});

export const list = query({
  args: { category: v.optional(categoryValidator) },
  handler: async (ctx, { category }) => {
    const me = await requireUser(ctx);
    const tools = category
      ? await ctx.db.query("tools").withIndex("by_category", (q) => q.eq("category", category)).order("desc").take(200)
      : await ctx.db.query("tools").order("desc").take(200);
    return Promise.all(
      tools.map(async (t) => {
        const owner = await ctx.db.get(t.ownerId);
        return {
          _id: t._id,
          name: t.name,
          category: t.category,
          condition: t.condition,
          description: t.description,
          available: await isAvailableToday(ctx, t._id),
          isMine: t.ownerId === me._id,
          owner: {
            firstName: owner?.name.split(" ")[0] ?? "Neighbor",
            trustedLender: owner?.trustedLender ?? false,
          },
        };
      }),
    );
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    return ctx.db.query("tools").withIndex("by_owner", (q) => q.eq("ownerId", me._id)).order("desc").collect();
  },
});

export const create = mutation({
  args: { name: v.string(), category: categoryValidator, condition: conditionValidator, description: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx);
    const { name, description } = cleanText(args.name, args.description);
    return ctx.db.insert("tools", {
      ownerId: me._id, // sempre da sessão, nunca do argumento
      name,
      description,
      category: args.category,
      condition: args.condition,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category: categoryValidator,
    condition: conditionValidator,
    description: v.string(),
  },
  handler: async (ctx, { toolId, ...fields }) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool) throw new ConvexError({ code: "NOT_FOUND" });
    assertSelf(me._id, tool.ownerId);
    const { name, description } = cleanText(fields.name, fields.description);
    await ctx.db.patch(toolId, { name, description, category: fields.category, condition: fields.condition });
  },
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, { toolId }) => {
    const me = await requireUser(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool) throw new ConvexError({ code: "NOT_FOUND" });
    assertSelf(me._id, tool.ownerId);
    const loans = await ctx.db.query("loans").withIndex("by_tool", (q) => q.eq("toolId", toolId)).collect();
    if (loans.some((l) => l.status === "pending" || l.status === "approved")) {
      throw new ConvexError({ code: "HAS_ACTIVE_LOANS" });
    }
    await ctx.db.delete(toolId);
  },
});