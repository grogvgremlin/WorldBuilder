// Structural seams, checked over the source code.
// CLAUDE.md: "No code reads entry content directly" (only through unseal());
// "Nothing bypasses the storage seam" (only src/store/ touches IndexedDB).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const srcDir = join(__dirname, "..", "..", "src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("seams", () => {
  it("reads the seal only in log/unseal.ts and writes it only in log/log.ts", () => {
    const offenders = sourceFiles(srcDir)
      .filter((path) => /\.seal\b/.test(readFileSync(path, "utf8")))
      .map((path) => relative(srcDir, path))
      .filter((path) => path !== join("log", "unseal.ts"));
    expect(offenders).toEqual([]);
  });

  it("touches IndexedDB only inside src/store/", () => {
    const offenders = sourceFiles(srcDir)
      .filter((path) => /indexedDB|IDBDatabase/.test(readFileSync(path, "utf8")))
      .map((path) => relative(srcDir, path))
      .filter((path) => !path.startsWith("store"));
    expect(offenders).toEqual([]);
  });
});
