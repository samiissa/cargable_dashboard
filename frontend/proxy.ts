import { NextResponse } from "next/server";

/**
 * Defense-in-depth only: guarantees `Cache-Control: private, no-store` on
 * every dashboard response so no protected page or API response is ever
 * cached by a browser, CDN, or reverse proxy. Identity and authorization
 * are independently verified inside the protected layout and the API
 * proxy — this Next.js Proxy never grants or denies access itself.
 */
export function proxy(): NextResponse {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
