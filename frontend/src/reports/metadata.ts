export type RangeMetadata =
  | {
      range: "7d" | "30d";
      semantics: "current_state_of_records_created_in_window";
      startInclusive: string;
      endExclusive: string;
    }
  | { range: "all"; semantics: "current_state_complete_set"; startInclusive: null; endExclusive: null };

export function isSnapshot(metadata: RangeMetadata): boolean {
  return metadata.range === "all";
}

export function formatRangeLabel(metadata: RangeMetadata): string {
  if (isSnapshot(metadata)) {
    return "Instantánea — no hay un rango de tiempo confiable disponible";
  }
  return `Rango ${metadata.range}: ${metadata.startInclusive} a ${metadata.endExclusive}`;
}

/** Formats a raw age in seconds (e.g. `failure.ageSeconds`) as a human-readable duration, same value, just legible. */
export function formatAge(ageSeconds: number): string {
  if (ageSeconds < 60) {
    return `${ageSeconds} s`;
  }
  if (ageSeconds < 3600) {
    return `${Math.floor(ageSeconds / 60)} min`;
  }
  if (ageSeconds < 86400) {
    return `${Math.floor(ageSeconds / 3600)} h`;
  }
  const days = Math.floor(ageSeconds / 86400);
  const hours = Math.floor((ageSeconds % 86400) / 3600);
  return `${days} d ${hours} h`;
}
