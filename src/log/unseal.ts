// The one read path for anything inside a log entry's seal.
// Design: design/infra.md §5 (sealed secrets, key grants), §5.1 (the sealed envelope);
// CLAUDE.md "One read path".
//
// Slice 0: a no-op. There is no encryption and no grant check; a "plain" seal is returned
// as it is. Later this checks the viewer's grants, then decrypts.
// No other code may read `entry.seal` directly.

import type { EntryBody, LogEnvelope } from "../schema";

// Who is looking. One person in slice 0.
export interface Viewer {
  person: string;
}

export const OWNER: Viewer = { person: "owner" };

// Returns the entry's body for this viewer, or null if the viewer may not read it.
export function unseal(entry: LogEnvelope, _viewer: Viewer): EntryBody | null {
  if (entry.seal.form === "plain") return entry.seal.body;
  return null; // a sealed entry: no keys in slice 0
}
