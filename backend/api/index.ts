import { createApp } from "../src/app.js";

/**
 * Vercel's Node.js Functions runtime natively calls a fetch-style default
 * export (`(request: Request) => Response | Promise<Response>`) directly —
 * exporting the Hono app itself satisfies that (Hono apps are callable via
 * `.fetch`, which Vercel's runtime picks up the same way it would a plain
 * function). Do NOT wrap this in `hono/vercel`'s `handle()`: that adapter
 * targets an older calling convention, and here it makes Vercel invoke this
 * export as a legacy `(req, res) => void` handler, silently discarding the
 * returned Response and hanging every request.
 */
export default createApp();
