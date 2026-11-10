// Renders each schema in SCHEMAS_TO_EMIT as JSON Schema text (one file each).
// Design: CLAUDE.md "Schema defined once"; build/slice-0-brief.md §3.

import { z } from "zod";
import { SCHEMAS_TO_EMIT } from "./index";

export function renderSchemaFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const [name, schema] of Object.entries(SCHEMAS_TO_EMIT)) {
    const jsonSchema = z.toJSONSchema(schema, { unrepresentable: "any" });
    files[name + ".schema.json"] = JSON.stringify(jsonSchema, null, 2) + "\n";
  }
  return files;
}
