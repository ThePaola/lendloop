import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const category = v.union(
  v.literal("power_tools"), v.literal("garden"), v.literal("kitchen"),
  v.literal("camping"), v.literal("other"),
);
export const loanStatus = v.union(
  v.literal("pending"), v.literal("approved"), v.literal("declined"),
  v.literal("cancelled"), v.literal("returned"),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    trustedLender: v.boolean(),
  }).index("by_token", ["tokenIdentifier"]),

  tools: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    category,
    condition: v.union(v.literal("new"), v.literal("good"), v.literal("worn")),
    description: v.string(),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]).index("by_category", ["category"]),

  loans: defineTable({
    toolId: v.id("tools"),
    ownerId: v.id("users"),
    borrowerId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    status: loanStatus,
    decidedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
  })
    .index("by_tool", ["toolId"])
    .index("by_owner", ["ownerId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_status_end", ["status", "endDate"]),

    notificationEvents: defineTable({
    eventId: v.string(),
    loanId: v.id("loans"),
    type: v.union(v.literal("request_created"), v.literal("status_changed")),
    recipient: v.union(v.literal("owner"), v.literal("borrower")),
    loanStatus,
    status: v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
    attempts: v.number(),
    lastError: v.optional(v.string()),
    sentAt: v.optional(v.number()),
  }).index("by_eventId", ["eventId"]).index("by_loan", ["loanId"]),

  reminders: defineTable({
    idempotencyKey: v.string(), // `${loanId}:${reminderDate}`
    loanId: v.id("loans"),
    reminderDate: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    n8nExecutionId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_key", ["idempotencyKey"]).index("by_loan", ["loanId"]),
});