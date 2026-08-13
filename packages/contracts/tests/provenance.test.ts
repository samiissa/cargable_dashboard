import { describe, expect, it } from "vitest";

type Provenance = {
  remote: string;
  revision: string;
  schemaPath: string;
  digest: string;
};

type ProvenanceOverrides = Partial<Pick<Provenance, "remote" | "revision" | "schemaPath">>;

type ProvenanceValidator = {
  validateProvenance: (input: Provenance, approved: Provenance, overrides?: ProvenanceOverrides) => boolean;
};

const approvedProvenance: Provenance = {
  remote: "https://example.test/cargable/provider.git",
  revision: "0123456789abcdef0123456789abcdef01234567",
  schemaPath: "contracts/admin-dashboard/v1/schema.json",
  digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

async function loadProvenanceValidator(): Promise<ProvenanceValidator> {
  const module: unknown = await import(new URL("../src/provenance.js", import.meta.url).href);

  if (
    typeof module !== "object" ||
    module === null ||
    !("validateProvenance" in module) ||
    typeof module.validateProvenance !== "function"
  ) {
    throw new Error("The provenance validator must export validateProvenance.");
  }

  const validateProvenance = module.validateProvenance;

  return { validateProvenance: (input, approved, overrides) => validateProvenance(input, approved, overrides) === true };
}

describe("contract provenance validation", () => {
  it("rejects an altered provider remote", async () => {
    const { validateProvenance } = await loadProvenanceValidator();

    expect(validateProvenance({ ...approvedProvenance, remote: "https://example.test/attacker/provider.git" }, approvedProvenance)).toBe(false);
  });

  it("rejects a mutable revision", async () => {
    const { validateProvenance } = await loadProvenanceValidator();

    expect(validateProvenance({ ...approvedProvenance, revision: "main" }, approvedProvenance)).toBe(false);
  });

  it("rejects an altered detached revision", async () => {
    const { validateProvenance } = await loadProvenanceValidator();

    expect(validateProvenance({ ...approvedProvenance, revision: "fedcba9876543210fedcba9876543210fedcba98" }, approvedProvenance)).toBe(false);
  });

  it("rejects an altered schema path", async () => {
    const { validateProvenance } = await loadProvenanceValidator();

    expect(validateProvenance({ ...approvedProvenance, schemaPath: "../../secrets.json" }, approvedProvenance)).toBe(false);
  });

  it("rejects an altered schema digest", async () => {
    const { validateProvenance } = await loadProvenanceValidator();

    expect(validateProvenance({ ...approvedProvenance, digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }, approvedProvenance)).toBe(false);
  });

  it.each([
    ["remote", { remote: "https://example.test/attacker/provider.git" }],
    ["revision", { revision: "release" }],
    ["schema path", { schemaPath: "other/schema.json" }],
  ] as const)("rejects a %s override", async (_name, overrides) => {
    const { validateProvenance } = await loadProvenanceValidator();

    expect(validateProvenance(approvedProvenance, approvedProvenance, overrides)).toBe(false);
  });
});
