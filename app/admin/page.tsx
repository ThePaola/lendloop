"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { StatusBadge } from "@/components/StatusBadge";
import { categoryLabel, errorMessage } from "@/lib/labels";

export default function AdminPage() {
  const me = useQuery(api.users.me);
  const isAdmin = me?.role === "admin";

  const users = useQuery(api.admin.listUsers, isAdmin ? {} : "skip");
  const tools = useQuery(api.tools.list, isAdmin ? {} : "skip");
  const loans = usePaginatedQuery(api.admin.listLoans, isAdmin ? {} : "skip", { initialNumItems: 20 });

  const removeTool = useMutation(api.admin.removeTool);
  const setTrusted = useMutation(api.admin.setTrustedLender);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (me === undefined) return <main className="mx-auto max-w-4xl px-4 py-12 text-zinc-500">Loading...</main>;
  if (!isAdmin) return <main className="mx-auto max-w-4xl px-4 py-12">{"You don't have access to this page."}</main>;

  const box = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-12">
      <h1 className="text-3xl font-bold">Admin</h1>
      {error && <p className="text-sm text-red-500">{error}</p>}

      <section>
        <h2 className="mb-3 text-xl font-semibold">Users</h2>
        <ul className="grid gap-2">
          {users?.map((u) => (
            <li key={u._id} className={`${box} flex items-center justify-between gap-4`}>
              <div>
                <p className="font-medium">{u.name} {u.role === "admin" && <span className="text-xs text-purple-500">admin</span>}</p>
                <p className="text-sm text-zinc-500">{u.email}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={u.trustedLender}
                  onChange={(e) => run(() => setTrusted({ userId: u._id, trusted: e.target.checked }))}
                />
                Trusted Lender
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">All listings</h2>
        <ul className="grid gap-2">
          {tools?.map((t) => (
            <li key={t._id} className={`${box} flex items-center justify-between gap-4`}>
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-zinc-500">{categoryLabel(t.category)} · by {t.owner.firstName}</p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(`Remove "${t.name}"?`)) run(() => removeTool({ toolId: t._id as Id<"tools"> }));
                }}
                className="text-sm text-red-500 underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">All loans</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-2">Tool</th>
                <th>Lender</th>
                <th>Borrower</th>
                <th>Dates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.results.map((l) => (
                <tr key={l._id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-2">{l.toolName}</td>
                  <td>{l.ownerName}</td>
                  <td>{l.borrowerName}</td>
                  <td>{l.startDate} to {l.endDate}</td>
                  <td><StatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loans.status === "CanLoadMore" && (
          <button onClick={() => loans.loadMore(20)} className="mt-3 text-sm underline">Load more</button>
        )}
      </section>
    </main>
  );
}