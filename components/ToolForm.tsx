"use client";

import { useState } from "react";
import { CATEGORIES, CONDITIONS, errorMessage, type Category, type Condition } from "@/lib/labels";

export type ToolInput = { name: string; category: Category; condition: Condition; description: string };

const EMPTY: ToolInput = { name: "", category: "power_tools", condition: "good", description: "" };
const field = "w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

export function ToolForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: ToolInput;
  submitLabel: string;
  onSubmit: (values: ToolInput) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<ToolInput>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
      if (!initial) setValues(EMPTY);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <input
        className={field}
        placeholder="Tool name"
        maxLength={80}
        required
        value={values.name}
        onChange={(e) => setValues({ ...values, name: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          className={field}
          value={values.category}
          onChange={(e) => setValues({ ...values, category: e.target.value as Category })}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          className={field}
          value={values.condition}
          onChange={(e) => setValues({ ...values, condition: e.target.value as Condition })}
        >
          {CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <textarea
        className={field}
        placeholder="Short description"
        maxLength={500}
        rows={3}
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button disabled={saving} className="rounded-md bg-purple-700 px-4 py-2 font-medium text-white disabled:opacity-50">
          {saving ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md px-4 py-2">Cancel</button>
        )}
      </div>
    </form>
  );
}