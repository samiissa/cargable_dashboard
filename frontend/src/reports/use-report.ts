"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ZodType } from "zod";

import type { SupportedRange } from "../api/dashboard-proxy";

/** Matches the backend/frontend proxy's fail-closed refresh contract. */
export const REFRESH_INTERVAL_MS = 300_000;

export type ReportStatus = "loading" | "ready" | "empty" | "stale" | "unavailable";

export interface UseReportResult<T> {
  data: T | undefined;
  status: ReportStatus;
  lastUpdatedAt: Date | undefined;
  refresh: () => void;
}

export interface UseReportOptions<T> {
  path: string;
  range?: SupportedRange;
  schema: ZodType<T>;
  isEmpty?: (data: T) => boolean;
  fetchImpl?: typeof fetch;
}

/**
 * Fetches a report through the same-origin dashboard proxy, refreshes it
 * every five minutes while mounted, and — on a failed refresh — retains the
 * last successful result and marks it stale rather than discarding it.
 */
export function useReport<T>({ path, range, schema, isEmpty, fetchImpl = fetch }: UseReportOptions<T>): UseReportResult<T> {
  const [data, setData] = useState<T>();
  const [status, setStatus] = useState<ReportStatus>("loading");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>();
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const query = range ? `?range=${range}` : "";
      const res = await fetchImpl(`/api/dashboard/${path}${query}`, { cache: "no-store" });
      if (!res.ok) throw new Error("request failed");

      const json: unknown = await res.json();
      const parsed = schema.safeParse(json);
      if (!parsed.success) throw new Error("invalid response");

      setData(parsed.data);
      hasDataRef.current = true;
      setLastUpdatedAt(new Date());
      setStatus(isEmpty?.(parsed.data) ? "empty" : "ready");
    } catch {
      setStatus(hasDataRef.current ? "stale" : "unavailable");
    }
  }, [path, range, schema, isEmpty, fetchImpl]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { data, status, lastUpdatedAt, refresh: load };
}
