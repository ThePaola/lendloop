"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatusBadge } from "@/components/StatusBadge";
import { errorMessage } from "@/lib/labels";
import { ActivityLine } from "@/components/ActivityLine";

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
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Incoming requests</h1>
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      <ul className="mt-8 grid gap-3">
        {loans === undefined ? (
          <p className="text-zinc-500">Loading...</p>
        ) : loans.length === 0 ? (
          <p className="text-zinc-500">No requests for your tools yet.</p>
        ) : (
          loans.map((l) => (
            <li key={l._id} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <p className="font-medium">{l.toolName} <span className="text-sm font-normal text-zinc-500">for {l.otherFirstName}</span></p>
                <p className="text-sm text-zinc-500">{l.startDate} to {l.endDate}</p>
                <ActivityLine loanId={l._id} />
              </div>
              <div className="flex items-center gap-3 text-sm">
                <StatusBadge status={l.status} />
                {l.status === "pending" && (
                  <>
                    <button onClick={() => run(() => decide({ loanId: l._id, decision: "approved" }))} className="text-green-600 underline">Approve</button>
                    <button onClick={() => run(() => decide({ loanId: l._id, decision: "declined" }))} className="text-red-500 underline">Decline</button>
                  </>
                )}
                {l.status === "approved" && (
                  <button onClick={() => run(() => markReturned({ loanId: l._id }))} className="underline">Mark returned</button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}