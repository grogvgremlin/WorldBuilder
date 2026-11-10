// The acceptance-case worlds from test/fixtures/, bundled so the app can load them.
// Design: build/slice-0-brief.md §3 "Fixtures".

const files = import.meta.glob("../../test/fixtures/*.yaml", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export interface Fixture {
  name: string; // file name, e.g. e1-handgunners.yaml
  text: string;
}

export const FIXTURES: Fixture[] = Object.entries(files)
  .map(([path, text]) => ({ name: path.split("/").pop()!, text }))
  .sort((a, b) => a.name.localeCompare(b.name));
