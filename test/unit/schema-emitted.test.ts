// The JSON Schema files in schema/ match the zod schemas. Run `npm run schema` if this fails.
// Design: CLAUDE.md "Schema defined once".

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderSchemaFiles } from "../../src/schema/emit";

describe("emitted JSON Schema", () => {
  it("is up to date", () => {
    for (const [fileName, text] of Object.entries(renderSchemaFiles())) {
      expect(readFileSync(join(__dirname, "..", "..", "schema", fileName), "utf8"), fileName).toBe(text);
    }
  });
});
