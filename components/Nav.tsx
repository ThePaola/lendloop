"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const LINKS = [
  { href: "/tools", label: "Tools" },
  { href: "/me/listings", label: "My listings" },
  { href: "/me/requests", label: "My requests" },
  { href: "/me/incoming", label: "Incoming" },
];

export function Nav() {
  const me = useQuery(api.users.me);
  const pathname = usePathname();
  const linkClass = (href: string) => (pathname.startsWith(href) ? "font-semibold" : "text-zinc-500 hover:text-current");

  return (
    <nav className="flex items-center gap-5 text-sm">
      <Link href="/" className="text-base font-bold">LendLoop</Link>
      {me && LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={linkClass(l.href)}>{l.label}</Link>
      ))}
      {me?.role === "admin" && <Link href="/admin" className={linkClass("/admin")}>Admin</Link>}
    </nav>
  );
}