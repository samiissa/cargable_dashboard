"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/business", label: "Business" },
  { href: "/invoices", label: "Invoices" },
  { href: "/operations", label: "Operations" },
] as const;

const linkBaseClass =
  "rounded-full px-4 py-2 text-sm font-semibold outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2";

/** Read-only navigation only — no administrator or business-data mutation controls exist anywhere in this dashboard. */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard reports" className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-4">
      <ul className="flex gap-2">
        {LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`${linkBaseClass} ${active ? "bg-primary text-onPrimary" : "text-onSurfaceMuted hover:text-onSurface"}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
