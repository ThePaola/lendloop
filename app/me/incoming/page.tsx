"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatusBadge } from "@/components/StatusBadge";
import { ActivityLine } from "@/components/ActivityLine";
import { errorMessage, formatRange } from "@/lib/labels";

export default function IncomingRequestsPage() {
  const me = useQuery(api.users.me);
  const loans = useQuery(api.loans.incoming, me ? {} : "skip");
  const decide = useMutation(api.loans.decide);
  const markReturned = useMutation(api.loans.markReturned);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <main className="page">
      <p className="eyebrow">Neighbors asking for your tools</p>
      <h1 className="page-title mt-2">Incoming requests</h1>
      {error && <p className="error mt-4">{error}</p>}

      {loans === undefined ? (
        <p className="mt-8 text-sm text-muted">Loading...</p>
      ) : loans.length === 0 ? (
        <p className="empty mt-8">No requests for your tools yet.</p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {loans.map((l) => (
            <li key={l._id} className="card flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display text-lg font-semibold">{l.toolName}</p>
                <p className="text-sm text-muted">
                  for {l.otherFirstName} · {formatRange(l.startDate, l.endDate)}
                </p>
                <ActivityLine loanId={l._id} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={l.status} />
                {l.status === "pending" && (
                  <>
                    <button onClick={() => run(() => decide({ loanId: l._id, decision: "approved" }))} className="btn btn-primary btn-sm">
                      Approve
                    </button>
                    <button onClick={() => run(() => decide({ loanId: l._id, decision: "declined" }))} className="btn btn-outline btn-sm">
                      Decline
                    </button>
                  </>
                )}
                {l.status === "approved" && (
                  <button onClick={() => run(() => markReturned({ loanId: l._id }))} className="btn btn-outline btn-sm">
                    Mark returned
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
