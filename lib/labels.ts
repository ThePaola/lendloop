import { ConvexError } from "convex/values";

export const CATEGORIES = [
  { value: "power_tools", label: "Power tools" },
  { value: "garden", label: "Garden" },
  { value: "kitchen", label: "Kitchen" },
  { value: "camping", label: "Camping" },
  { value: "other", label: "Other" },
] as const;
export type Category = (typeof CATEGORIES)[number]["value"];

export const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "worn", label: "Worn" },
] as const;
export type Condition = (typeof CONDITIONS)[number]["value"];

export const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? c;
export const conditionLabel = (c: string) => CONDITIONS.find((x) => x.value === c)?.label ?? c;

const MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Please sign in again.",
  FORBIDDEN: "You can't do that.",
  NOT_FOUND: "This item no longer exists.",
  INVALID_INPUT: "Please check the form fields.",
  HAS_ACTIVE_LOANS: "This tool has pending or active loans.",
};

export function errorMessage(err: unknown) {
  if (err instanceof ConvexError) {
    const code = (err.data as { code?: string } | undefined)?.code;
    if (code && MESSAGES[code]) return MESSAGES[code];
  }
  return "Something went wrong. Please try again.";
}