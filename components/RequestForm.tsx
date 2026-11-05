"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { errorMessage } from "@/lib/labels";

const todayLocal = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD no fuso do usuário

export function RequestForm({ toolId }: { toolId: Id<"tools"> }) {
  const request = useMutation(api.loans.request);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      await request({ toolId, startDate, endDate });
      setMessage({ ok: true, text: "Request sent!" });
      setStartDate("");
      setEndDate("");
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setSending(false);
    }
  }

  const field = "rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700";

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="date" required min={todayLocal()} value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
      <span className="text-sm text-zinc-500">to</span>
      <input type="date" required min={startDate || todayLocal()} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
      <button disabled={sending} className="rounded-md bg-purple-700 px-3 py-1 text-sm font-medium text-white disabled:opacity-50">
        {sending ? "Sending..." : "Request"}
      </button>
      {message && <p className={`w-full text-sm ${message.ok ? "text-green-600" : "text-red-500"}`}>{message.text}</p>}
    </form>
  );
}