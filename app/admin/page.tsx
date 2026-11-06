"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { StatusBadge } from "@/components/StatusBadge";
import { categoryLabel, errorMessage, formatRange } from "@/lib/labels";

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

  if (me === undefined) return <main className="page text-sm text-muted">Loading...</main>;
  if (!isAdmin) return <main className="page"><p className="empty">{"You don't have access to this page."}</p></main>;

  return (
    <main className="page">
      <p className="eyebrow">Moderation</p>
      <h1 className="page-title mt-2">Admin</h1>
      {error && <p className="error mt-4">{error}</p>}

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-xl font-semibold">Neighbors</h2>
          <ul className="mt-4 grid gap-2">
            {users?.map((u) => (
              <li key={u._id} className="card flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {u.name}
                    {u.role === "admin" && <span className="tag ml-2">admin</span>}
                  </p>
                  <p className="truncate text-sm text-muted">{u.email}</p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-forest"
                    checked={u.trustedLender}
                    onChange={(e) => run(() => setTrusted({ userId: u._id, trusted: e.target.checked }))}
                  />
                  Trusted lender
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">All listings</h2>
          <ul className="mt-4 grid gap-2">
            {tools?.map((t) => (
              <li key={t._id} className="card flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-muted">{categoryLabel(t.category)} · by {t.owner.firstName}</p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm(`Remove "${t.name}"?`)) run(() => removeTool({ toolId: t._id }));
                  }}
                  className="link text-clay"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">All loans</h2>
        <div className="card mt-4 overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Tool</th>
                <th className="px-5 py-3 font-semibold">Lender</th>
                <th className="px-5 py-3 font-semibold">Borrower</th>
                <th className="px-5 py-3 font-semibold">Dates</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loans.results.map((l) => (
                <tr key={l._id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium">{l.toolName}</td>
                  <td className="px-5 py-3">{l.ownerName}</td>
                  <td className="px-5 py-3">{l.borrowerName}</td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted">{formatRange(l.startDate, l.endDate)}</td>
                  <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loans.status === "CanLoadMore" && (
          <button onClick={() => loans.loadMore(20)} className="btn btn-outline mt-4">Load more</button>
        )}
      </section>
    </main>
  );
}
