import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local-only: lets the dev server be reached from another device on the
  // LAN (e.g. testing on a phone/tablet) instead of just `localhost`. Next.js
  // blocks cross-origin dev asset/HMR requests by default. Update the IP if
  // the machine's LAN address changes (DHCP). Irrelevant in production.
  allowedDevOrigins: ["192.168.1.92"],
  // `@cargable/contracts` ships raw TypeScript source (no prebuild step); Next
  // must transpile it directly rather than treating it as precompiled JS.
  transpilePackages: ["@cargable/contracts"],
  turbopack: {
    // `@cargable/contracts` is authored for Node's strict ESM resolution
    // (explicit `.js` specifiers pointing at `.ts` sources), which tsc,
    // Vitest, and esbuild all remap automatically but Turbopack does not.
    // Alias its two internal relative imports to their real `.ts` files so
    // this unmodified, already-tested upstream package still bundles here.
    resolveAlias: {
      "./generated/schema.js": "../packages/contracts/src/generated/schema.ts",
      "./provenance.js": "../packages/contracts/src/provenance.ts",
    },
  },
};

export default nextConfig;
