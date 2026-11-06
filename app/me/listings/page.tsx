"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ToolForm } from "@/components/ToolForm";
import { categoryLabel, conditionLabel, errorMessage } from "@/lib/labels";

export default function MyListingsPage() {
  const me = useQuery(api.users.me);
  const tools = useQuery(api.tools.mine, me ? {} : "skip");
  const create = useMutation(api.tools.create);
  const update = useMutation(api.tools.update);
  const remove = useMutation(api.tools.remove);
  const [editingId, setEditingId] = useState<Id<"tools"> | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleRemove(toolId: Id<"tools">) {
    if (!window.confirm("Remove this listing?")) return;
    setRowError(null);
    try {
      await remove({ toolId });
    } catch (err) {
      setRowError(errorMessage(err));
    }
  }

  return (
    <main className="page">
      <p className="eyebrow">Your shelf</p>
      <h1 className="page-title mt-2">My listings</h1>

      <div className="mt-8 grid items-start gap-8 md:grid-cols-[340px_1fr]">
        <section className="card md:sticky md:top-24">
          <h2 className="font-display text-lg font-semibold">List a tool</h2>
          <div className="mt-4">
            <ToolForm submitLabel="Add tool" onSubmit={(v) => create(v)} />
          </div>
        </section>

        <section>
          {rowError && <p className="error mb-4">{rowError}</p>}
          {tools === undefined ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : tools.length === 0 ? (
            <p className="empty">{"You haven't listed any tools yet."}</p>
          ) : (
            <ul className="grid gap-3">
              {tools.map((t) => (
                <li key={t._id} className="card">
                  {editingId === t._id ? (
                    <ToolForm
                      initial={{ name: t.name, category: t.category, condition: t.condition, description: t.description }}
                      submitLabel="Save"
                      onSubmit={async (v) => {
                        await update({ toolId: t._id, ...v });
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="tag">{categoryLabel(t.category)}</span>
                        <p className="mt-2 font-display text-lg font-semibold">{t.name}</p>
                        <p className="text-sm text-muted">{conditionLabel(t.condition)} condition</p>
                        {t.description && <p className="mt-2 text-sm leading-relaxed">{t.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-4">
                        <button onClick={() => setEditingId(t._id)} className="link">Edit</button>
                        <button onClick={() => handleRemove(t._id)} className="link text-clay">Remove</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
