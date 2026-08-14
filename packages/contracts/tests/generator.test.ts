import { describe, expect, it } from "vitest";

import type { JsonSchema } from "../src/generator.js";
import { assessCompatibility, generateContractModule } from "../src/generator.js";

const baseSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["contractVersion", "authorized"],
  properties: {
    contractVersion: { const: "admin-dashboard/v1" },
    authorized: { const: true },
  },
};

describe("generateContractModule", () => {
  it("emits a named Zod export derived only from schema fields", () => {
    const output = generateContractModule({ oneOf: [baseSchema] });

    expect(output).toContain("export const authorizationSchema");
    expect(output).toContain('z.literal("admin-dashboard/v1")');
    expect(output).toContain("z.literal(true)");
  });

  it("marks non-required properties optional and forbids extra keys", () => {
    const withOptional: JsonSchema = {
      type: "object",
      additionalProperties: false,
      required: ["contractVersion"],
      properties: {
        contractVersion: { const: "admin-dashboard/v1" },
        warnings: { type: "array", items: { type: "string" } },
      },
    };

    const output = generateContractModule({ oneOf: [withOptional] });

    expect(output).toContain("warnings: z.array(z.string()).optional()");
    expect(output).toContain(".strict()");
  });

  it("merges an object's own required/strict keywords into each sibling oneOf branch", () => {
    const metadataHolder: JsonSchema = {
      type: "object",
      additionalProperties: false,
      required: ["contractVersion", "metadata"],
      properties: {
        contractVersion: { const: "admin-dashboard/v1" },
        metadata: {
          type: "object",
          unevaluatedProperties: false,
          required: ["range", "startInclusive"],
          oneOf: [
            { properties: { range: { enum: ["7d", "30d"] }, startInclusive: { type: "string" } } },
            { properties: { range: { const: "all" }, startInclusive: { const: null } } },
          ],
        },
      },
    };

    const output = generateContractModule({ oneOf: [metadataHolder] });

    expect(output).toContain('range: z.enum(["7d","30d"]),');
    expect(output).toContain("startInclusive: z.string(),");
    expect(output).toContain('range: z.literal("all"),');
    expect(output).toContain("startInclusive: z.literal(null),");
    expect(output.match(/\.strict\(\)/g)?.length).toBe(3);
  });
});

describe("generated-output drift detection", () => {
  it("is deterministic: regenerating from the same schema produces byte-identical output", () => {
    expect(generateContractModule({ oneOf: [baseSchema] })).toBe(generateContractModule({ oneOf: [baseSchema] }));
  });

  it("detects drift: a changed schema field produces different generated output", () => {
    const changed: JsonSchema = { ...baseSchema, properties: { ...baseSchema.properties, authorized: { const: false } } };

    expect(generateContractModule({ oneOf: [changed] })).not.toBe(generateContractModule({ oneOf: [baseSchema] }));
  });
});

describe("assessCompatibility", () => {
  it("treats an additive optional property as v1-compatible", () => {
    const candidate: JsonSchema = {
      ...baseSchema,
      properties: { ...baseSchema.properties, note: { type: "string" } },
    };

    expect(assessCompatibility(baseSchema, candidate)).toBe("compatible");
  });

  it("treats a removed required property as a breaking, version-bumping change", () => {
    const candidate: JsonSchema = {
      ...baseSchema,
      required: ["contractVersion"],
    };

    expect(assessCompatibility(baseSchema, candidate)).toBe("breaking");
  });

  it("treats a changed field type as a breaking, version-bumping change", () => {
    const candidate: JsonSchema = {
      ...baseSchema,
      properties: { ...baseSchema.properties, authorized: { type: "string" } },
    };

    expect(assessCompatibility(baseSchema, candidate)).toBe("breaking");
  });
});
