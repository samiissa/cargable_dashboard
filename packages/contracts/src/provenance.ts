export type Provenance = {
  remote: string;
  revision: string;
  schemaPath: string;
  digest: string;
};

export type ProvenanceOverrides = Partial<Pick<Provenance, "remote" | "revision" | "schemaPath">>;

const DETACHED_REVISION_PATTERN = /^[0-9a-f]{40}$/;

/**
 * Validates that a candidate provenance record is byte-identical to the one
 * and only approved provenance record. There is no override mechanism: any
 * caller-supplied override is rejected outright, and the revision must be a
 * detached 40-character SHA — never a mutable ref such as a branch name.
 */
export function validateProvenance(
  input: Provenance,
  approved: Provenance,
  overrides?: ProvenanceOverrides,
): boolean {
  if (overrides !== undefined && Object.keys(overrides).length > 0) {
    return false;
  }

  if (!DETACHED_REVISION_PATTERN.test(approved.revision) || !DETACHED_REVISION_PATTERN.test(input.revision)) {
    return false;
  }

  return (
    input.remote === approved.remote &&
    input.revision === approved.revision &&
    input.schemaPath === approved.schemaPath &&
    input.digest === approved.digest
  );
}
