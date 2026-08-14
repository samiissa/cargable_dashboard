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
    return "Snapshot — no reliable time range available";
  }
  return `${metadata.range} range: ${metadata.startInclusive} to ${metadata.endExclusive}`;
}
