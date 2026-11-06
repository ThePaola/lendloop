"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CATEGORIES, categoryLabel, conditionLabel, type Category } from "@/lib/labels";
import { RequestForm } from "@/components/RequestForm";

function Availability({ available }: { available: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${available ? "text-forest" : "text-clay"}`}>
      <span className={`size-1.5 rounded-full ${available ? "bg-forest" : "bg-clay"}`} />
      {available ? "Available" : "On loan"}
    </span>
  );
}

const chip = (active: boolean) =>
  `cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${
    active ? "border-forest bg-forest text-paper" : "border-line bg-card text-muted hover:text-ink"
  }`;

export default function ToolsPage() {
  const me = useQuery(api.users.me);
  const [category, setCategory] = useState<Category | "">("");
  const tools = useQuery(api.tools.list, me ? (category ? { category } : {}) : "skip");

  return (
    <main className="page">
      <p className="eyebrow">The board</p>
      <h1 className="page-title mt-2">Tools</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setCategory("")} className={chip(category === "")}>All</button>
        {CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setCategory(c.value)} className={chip(category === c.value)}>
            {c.label}
          </button>
        ))}
      </div>

      {tools === undefined ? (
        <p className="mt-8 text-sm text-muted">Loading...</p>
      ) : tools.length === 0 ? (
        <p className="empty mt-8">No tools in this category yet.</p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {tools.map((t) => (
            <li key={t._id} className="card flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <span className="tag">{categoryLabel(t.category)}</span>
                <Availability available={t.available} />
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold">{t.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {conditionLabel(t.condition)} condition · lent by {t.isMine ? "you" : t.owner.firstName}
              </p>
              {t.owner.trustedLender && (
                <p className="mt-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-forest-soft px-2 py-0.5 text-xs font-medium text-forest">
                    ✓ Trusted lender
                  </span>
                </p>
              )}
              {t.description && <p className="mt-3 text-sm leading-relaxed">{t.description}</p>}
              {!t.isMine && (
                <div className="mt-auto pt-5">
                  <div className="border-t border-dashed border-line pt-4">
                    <RequestForm toolId={t._id} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
