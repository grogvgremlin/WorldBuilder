// Writes the zod schemas in src/schema/ out as JSON Schema files in schema/.
// Run: npm run schema. A test (test/unit/schema-emitted.test.ts) fails if they are stale.

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { renderSchemaFiles } from "../src/schema/emit";

const outDir = join(process.cwd(), "schema");
mkdirSync(outDir, { recursive: true });
for (const [fileName, text] of Object.entries(renderSchemaFiles())) {
  writeFileSync(join(outDir, fileName), text);
  console.log("wrote schema/" + fileName);
}
