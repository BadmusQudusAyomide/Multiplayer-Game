"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

const links: { href: Route; label: string }[] = [
  { href: "/online", label: "Online" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <nav className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="font-extrabold tracking-tight text-gray-900">
            Multi<span className="text-blue-600">Play</span>
          </Link>
          <ul className="flex items-center gap-1">
            {links.map(({ href, label }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={[
                      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </header>
  );
}
