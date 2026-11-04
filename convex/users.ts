import { query, mutation, internalMutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getCurrentUser } from "../convex/lib/auth";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED" });

    const email = identity.email ?? "";
    const name = identity.name || email.split("@")[0] || "Neighbor";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) {
      if (existing.email !== email || existing.name !== name) {
        await ctx.db.patch(existing._id, { email, name }); // nunca mexe em role
      }
      return existing._id;
    }

    return ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name,
      email,
      role: "user",
      trustedLender: false,
    });
  },
});

// npx convex run users:setRole '{"email":"voce@exemplo.com","role":"admin"}'
export const setRole = internalMutation({
  args: { email: v.string(), role: v.union(v.literal("admin"), v.literal("user")) },
  handler: async (ctx, { email, role }) => {
    const user = await ctx.db.query("users").filter((q) => q.eq(q.field("email"), email)).unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND" });
    await ctx.db.patch(user._id, { role });
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return { _id: user._id, name: user.name, role: user.role, trustedLender: user.trustedLender };
  },
});