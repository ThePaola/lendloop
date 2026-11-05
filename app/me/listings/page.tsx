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
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">My listings</h1>

      <section className="mt-8 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="mb-3 font-semibold">List a tool</h2>
        <ToolForm submitLabel="Add tool" onSubmit={(v) => create(v)} />
      </section>

      {rowError && <p className="mt-6 text-sm text-red-500">{rowError}</p>}

      <ul className="mt-8 grid gap-3">
        {tools === undefined ? (
          <p className="text-zinc-500">Loading...</p>
        ) : tools.length === 0 ? (
          <p className="text-zinc-500">{"You haven't listed any tools yet."}</p>
        ) : (
          tools.map((t) => (
            <li key={t._id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
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
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-zinc-500">
                      {categoryLabel(t.category)} · {conditionLabel(t.condition)}
                    </p>
                    {t.description && <p className="mt-1 text-sm">{t.description}</p>}
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => setEditingId(t._id)} className="underline">Edit</button>
                    <button onClick={() => handleRemove(t._id)} className="text-red-500 underline">Remove</button>
                  </div>
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </main>
  );
}