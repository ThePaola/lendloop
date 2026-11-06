"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StatusBadge } from "@/components/StatusBadge";
import { ActivityLine } from "@/components/ActivityLine";
import { errorMessage, formatRange } from "@/lib/labels";

export default function MyRequestsPage() {
  const me = useQuery(api.users.me);
  const loans = useQuery(api.loans.mine, me ? {} : "skip");
  const cancel = useMutation(api.loans.cancel);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel(loanId: Id<"loans">) {
    setError(null);
    try {
      await cancel({ loanId });
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <main className="page">
      <p className="eyebrow">Things you asked for</p>
      <h1 className="page-title mt-2">My requests</h1>
      {error && <p className="error mt-4">{error}</p>}

      {loans === undefined ? (
        <p className="mt-8 text-sm text-muted">Loading...</p>
      ) : loans.length === 0 ? (
        <p className="empty mt-8">
          {"You haven't requested anything yet. "}
          <Link href="/tools" className="link">Browse tools</Link>
        </p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {loans.map((l) => (
            <li key={l._id} className="card flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display text-lg font-semibold">{l.toolName}</p>
                <p className="text-sm text-muted">
                  from {l.otherFirstName} · {formatRange(l.startDate, l.endDate)}
                </p>
                <ActivityLine loanId={l._id} />
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={l.status} />
                {l.status === "pending" && (
                  <button onClick={() => handleCancel(l._id)} className="link text-clay">Cancel</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
