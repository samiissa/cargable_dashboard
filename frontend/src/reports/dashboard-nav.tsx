import Link from "next/link";

/** Read-only navigation only — no administrator or business-data mutation controls exist anywhere in this dashboard. */
export function DashboardNav() {
  return (
    <nav aria-label="Dashboard reports">
      <ul>
        <li>
          <Link href="/business">Business</Link>
        </li>
        <li>
          <Link href="/invoices">Invoices</Link>
        </li>
        <li>
          <Link href="/operations">Operations</Link>
        </li>
      </ul>
    </nav>
  );
}
