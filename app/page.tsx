"use client";

import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { categoryLabel } from "@/lib/labels";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const tools = useQuery(api.tools.listPublic);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-bold">LendLoop</h1>
      <p className="mt-2 text-lg text-zinc-500">{"Borrow what you need. Lend what you don't."}</p>

      <div className="mt-6">
        {isLoading ? null : isAuthenticated ? (
          <Link href="/tools" className="inline-block rounded-full bg-purple-700 px-5 py-2.5 font-medium text-white">
            Browse and borrow
          </Link>
        ) : (
          <SignInButton mode="modal">
            <button className="rounded-full bg-purple-700 px-5 py-2.5 font-medium text-white">
              Sign in to lend or borrow
            </button>
          </SignInButton>
        )}
      </div>

      <h2 className="mt-12 text-xl font-semibold">Available in the neighborhood</h2>
      {tools === undefined ? (
        <p className="mt-4 text-zinc-500">Loading...</p>
      ) : tools.length === 0 ? (
        <p className="mt-4 text-zinc-500">No tools available right now.</p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
          {tools.map((t) => (
            <li key={t._id} className="flex justify-between py-3">
              <span className="font-medium">{t.name}</span>
              <span className="text-zinc-500">{categoryLabel(t.category)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}