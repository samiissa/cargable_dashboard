import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { dashboardConfig } from "../../src/auth/config";
import { verifySession } from "../../src/auth/session";
import { DashboardNav } from "../../src/reports/dashboard-nav";

export const dynamic = "force-dynamic";

/** Server-side administrator authorization: calls the same backend `/v1/authorization` resource every protected API request uses, so eligibility is never inferred from authentication alone. */
async function isAuthorizedAdmin(accessToken: string): Promise<boolean> {
  const config = dashboardConfig();
  try {
    const res = await fetch(`${config.backendUrl}/v1/authorization`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const session = await verifySession(cookieHeader);
  if (!session.authenticated || !(await isAuthorizedAdmin(session.accessToken))) {
    redirect("/login");
  }

  return (
    <div>
      <DashboardNav />
      <main>{children}</main>
    </div>
  );
}
