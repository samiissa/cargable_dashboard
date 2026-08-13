import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(import.meta.dirname, "../../..");

async function readJson(relativePath: string): Promise<Record<string, unknown>> {
  const contents = await readFile(resolve(repositoryRoot, relativePath), "utf8");
  return JSON.parse(contents) as Record<string, unknown>;
}

describe("workspace scaffold baseline", () => {
  it("enforces strict TypeScript in every workspace package", async () => {
    const [baseConfig, contractsConfig, backendConfig, frontendConfig] = await Promise.all([
      readJson("tsconfig.base.json"),
      readJson("packages/contracts/tsconfig.json"),
      readJson("backend/tsconfig.json"),
      readJson("frontend/tsconfig.json"),
    ]);

    expect(baseConfig.compilerOptions).toMatchObject({ strict: true });
    expect(contractsConfig.extends).toBe("../../tsconfig.base.json");
    expect(backendConfig.extends).toBe("../tsconfig.base.json");
    expect(frontendConfig.extends).toBe("../tsconfig.base.json");
  });

  it("pins tooling and exposes quality scripts for each workspace", async () => {
    const [root, contracts, backend, frontend] = await Promise.all([
      readJson("package.json"),
      readJson("packages/contracts/package.json"),
      readJson("backend/package.json"),
      readJson("frontend/package.json"),
    ]);

    expect(root.devDependencies).toMatchObject({
      eslint: "9.39.1",
      typescript: "5.9.3",
      vitest: "4.1.10",
    });
    expect(contracts.scripts).toMatchObject({ typecheck: "tsc --noEmit", lint: "eslint .", build: "tsc --noEmit" });
    expect(backend.scripts).toMatchObject({ typecheck: "tsc --noEmit", lint: "eslint .", build: "tsc --noEmit" });
    expect(frontend.scripts).toMatchObject({ typecheck: "tsc --noEmit", lint: "eslint .", build: "tsc --noEmit" });
  });

  it("commits a pnpm lockfile for the declared package manager", async () => {
    const [root, lockfile] = await Promise.all([
      readJson("package.json"),
      readFile(resolve(repositoryRoot, "pnpm-lock.yaml"), "utf8"),
    ]);

    expect(root.packageManager).toBe("pnpm@10.14.0");
    expect(lockfile).toContain("lockfileVersion: '9.0'");
  });
});
