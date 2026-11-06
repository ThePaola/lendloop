"use client";

import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { categoryLabel } from "@/lib/labels";

const STEPS = [
  { n: "1", title: "List what you rarely use", text: "That drill you used twice? Someone two streets over needs it this weekend." },
  { n: "2", title: "Ask for the dates you need", text: "Pick a range. The owner approves or declines in one click." },
  { n: "3", title: "Get it back on time", text: "Friendly reminders go out automatically when a loan runs late." },
];

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const tools = useQuery(api.tools.listPublic);

  return (
    <main className="page">
      <section className="grid items-center gap-12 border-b border-line pb-14 md:grid-cols-[1.45fr_1fr]">
        <div>
          <p className="eyebrow">A neighborhood tool library</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] font-semibold tracking-tight lg:text-[3.5rem]">
            Borrow what you need.
            <br />
            <span className="text-forest italic">{"Lend what you don't."}</span>
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-muted">
            LendLoop helps neighbors share drills, ladders, tents and pans instead of everyone buying their own.
          </p>
          <div className="mt-8">
            {isLoading ? null : isAuthenticated ? (
              <Link href="/tools" className="btn btn-primary">Browse and borrow</Link>
            ) : (
              <SignInButton mode="modal">
                <button className="btn btn-primary">Sign in to lend or borrow</button>
              </SignInButton>
            )}
          </div>
        </div>

        <div className="relative -rotate-[1.5deg] rounded-md border border-line bg-card p-6 shadow-[0_12px_30px_-14px_rgb(31_27_22/0.3)]">
          <span aria-hidden className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-clay shadow-sm" />
          <p className="eyebrow">How it works</p>
          <ol className="mt-4 space-y-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="font-display text-2xl leading-none text-forest">{s.n}</span>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold">On the board today</h2>
          {tools && tools.length > 0 && <p className="text-sm text-muted">{tools.length} available</p>}
        </div>
        {tools === undefined ? (
          <p className="mt-6 text-sm text-muted">Loading...</p>
        ) : tools.length === 0 ? (
          <p className="empty mt-6">Nothing on the board yet. Be the first to lend something.</p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((t) => (
              <li key={t._id} className="card">
                <span className="tag">{categoryLabel(t.category)}</span>
                <p className="mt-3 font-display text-lg font-semibold">{t.name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
