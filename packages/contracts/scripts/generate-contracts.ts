// Regenerates src/generated/schema.ts from the pinned provider schema.
// Usage: node scripts/generate-contracts.ts <path-to-checked-out-schema.json>
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { generateContractModule } from "../src/generator.ts";

const packageRoot = resolve(import.meta.dirname, "..");

async function main(): Promise<void> {
  const schemaPathArg = process.argv[2];
  if (!schemaPathArg) {
    throw new Error("Usage: generate-contracts.ts <path-to-checked-out-schema.json>");
  }

  const source: { digest: string } = JSON.parse(await readFile(resolve(packageRoot, "source.json"), "utf8"));
  const schemaText = await readFile(resolve(schemaPathArg), "utf8");
  const actualDigest = `sha256:${createHash("sha256").update(schemaText).digest("hex")}`;

  if (actualDigest !== source.digest) {
    throw new Error(`Schema digest mismatch: expected ${source.digest}, got ${actualDigest}`);
  }

  const schema: { oneOf: readonly Parameters<typeof generateContractModule>[0]["oneOf"][number][] } =
    JSON.parse(schemaText);
  const output = generateContractModule(schema);

  await writeFile(resolve(packageRoot, "src/generated/schema.ts"), output);
}

await main();
