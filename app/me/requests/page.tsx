"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StatusBadge } from "@/components/StatusBadge";
import { errorMessage } from "@/lib/labels";

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
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">My requests</h1>
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      <ul className="mt-8 grid gap-3">
        {loans === undefined ? (
          <p className="text-zinc-500">Loading...</p>
        ) : loans.length === 0 ? (
          <p className="text-zinc-500">{"You haven't requested anything yet."}</p>
        ) : (
          loans.map((l) => (
            <li key={l._id} className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div>
                <p className="font-medium">{l.toolName} <span className="text-sm font-normal text-zinc-500">from {l.otherFirstName}</span></p>
                <p className="text-sm text-zinc-500">{l.startDate} to {l.endDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={l.status} />
                {l.status === "pending" && (
                  <button onClick={() => handleCancel(l._id)} className="text-sm text-red-500 underline">Cancel</button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}