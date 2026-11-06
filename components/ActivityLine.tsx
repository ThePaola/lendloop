"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function ago(ms: number) {
  const diff = (ms - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit);
  }
  return "just now";
}

function describe(item: { label: string; state: string; attempts: number; at: number }) {
  if (item.state === "sent") return `${item.label} sent ${ago(item.at)}`;
  if (item.state === "failed") return `${item.label} failed ${ago(item.at)}`;
  return item.attempts === 0 ? `${item.label} sending...` : `${item.label} retrying (attempt ${item.attempts + 1})`;
}

export function ActivityLine({ loanId }: { loanId: Id<"loans"> }) {
  const items = useQuery(api.loans.activity, { loanId });
  if (!items || items.length === 0) return null;

  return (
    <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
      {items.map((item) => (
        <li key={item.id} className={item.state === "failed" ? "text-red-500" : undefined}>
          {describe(item)}
        </li>
      ))}
    </ul>
  );
}