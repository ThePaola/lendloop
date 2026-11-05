"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CATEGORIES, categoryLabel, conditionLabel, type Category } from "@/lib/labels";
import { RequestForm } from "@/components/RequestForm";

export default function ToolsPage() {
  const me = useQuery(api.users.me);
  const [category, setCategory] = useState<Category | "">("");
  const tools = useQuery(api.tools.list, me ? (category ? { category } : {}) : "skip");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Tools</h1>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "")}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <ul className="mt-8 grid gap-3">
        {tools === undefined ? (
          <p className="text-zinc-500">Loading...</p>
        ) : tools.length === 0 ? (
          <p className="text-zinc-500">No tools in this category yet.</p>
        ) : (
          tools.map((t) => (
            <li key={t._id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-zinc-500">
                    {categoryLabel(t.category)} · {conditionLabel(t.condition)} · lent by {t.isMine ? "you" : t.owner.firstName}
                    {t.owner.trustedLender && <span className="ml-2 rounded-full bg-purple-500/15 px-2 py-0.5 text-xs text-purple-500">Trusted Lender</span>}
                  </p>
                  {t.description && <p className="mt-1 text-sm">{t.description}</p>}
                </div>
                <span className={`text-sm font-medium ${t.available ? "text-green-600" : "text-amber-600"}`}>
                  {t.available ? "Available" : "On loan"}
                </span>
              </div>
              {!t.isMine && <RequestForm toolId={t._id} />}
            </li>
          ))
        )}
      </ul>
    </main>
  );
}