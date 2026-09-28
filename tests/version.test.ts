import { afterEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";

// `src/version.ts` is the single source of the version the service reports
// (/health, and any log line an operator quotes when raising a problem), so
// what it resolves to is worth asserting directly rather than only through
// the endpoints that happen to surface it.
//
// The module reads `package.json` once at import time and falls back to
// "unknown" when that read fails or the manifest carries no usable version.
// The fallback is the interesting half: it is the branch nothing exercises in
// a normal checkout, and the one that decides what an operator sees when the
// manifest is missing from an image.

/** The version the manifest actually declares, read independently of the module. */
async function packageVersion(): Promise<string> {
  const raw = await readFile(new URL("../package.json", import.meta.url), "utf8");
  return (JSON.parse(raw) as { version: string }).version;
}

/** Imports the module fresh, so its module-level manifest read runs again. */
async function importVersionModule() {
  vi.resetModules();
  return import("../src/version.js");
}

afterEach(() => {
  vi.doUnmock("node:module");
  vi.resetModules();
});

describe("version module", () => {
  it("reports the version declared in the package manifest", async () => {
    const { serviceVersion } = await importVersionModule();

    expect(serviceVersion).toBe(await packageVersion());
    expect(serviceVersion).not.toBe("unknown");
  });

  it("falls back to \"unknown\" when the manifest cannot be read", async () => {
    // A packaged image without the manifest, or an unreadable one, must not
    // take the service down or report a misleading version.
    vi.doMock("node:module", () => ({
      createRequire: () => () => {
        throw new Error("Cannot find module '../package.json'");
      },
    }));

    const { serviceVersion } = await importVersionModule();

    expect(serviceVersion).toBe("unknown");
  });

  it("falls back to \"unknown\" when the manifest carries no usable version", async () => {
    // A present-but-empty (or non-string) version is as unusable as a missing
    // manifest: reporting an empty string would leave an operator with
    // nothing to quote.
    vi.doMock("node:module", () => ({
      createRequire: () => () => ({ version: "" }),
    }));

    const { serviceVersion } = await importVersionModule();

    expect(serviceVersion).toBe("unknown");
  });

  it("falls back to \"unknown\" for a non-string version", async () => {
    vi.doMock("node:module", () => ({
      createRequire: () => () => ({ version: 42 }),
    }));

    const { serviceVersion } = await importVersionModule();

    expect(serviceVersion).toBe("unknown");
  });
});
