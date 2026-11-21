// A small reader for .xlsx workbooks: each sheet's cells as text, no formatting.
// Technical choice (build-log, Part B): a workbook is a zip of XML files; reading the few parts
// needed (the workbook, its sheets, the shared strings) takes about a hundred lines and no
// library. Deflate is undone by the browser's (and Node's) own DecompressionStream.
//
// Not supported, on purpose: formulas are read as their last saved value; dates as numbers;
// merged cells keep their value in the first cell only.

export interface XlsxSheet {
  name: string;
  rows: string[][];
}

// --- Zip ---------------------------------------------------------------------------------------

interface ZipEntry {
  name: string;
  method: number; // 0 stored, 8 deflate
  compressedSize: number;
  localOffset: number;
}

function u16(b: Uint8Array, at: number): number {
  return b[at] | (b[at + 1] << 8);
}
function u32(b: Uint8Array, at: number): number {
  return (b[at] | (b[at + 1] << 8) | (b[at + 2] << 16) | (b[at + 3] << 24)) >>> 0;
}

// The zip's central directory: where each file is, and how it's packed.
function zipEntries(b: Uint8Array): ZipEntry[] {
  let end = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
    if (u32(b, i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("not a zip file");
  const count = u16(b, end + 10);
  let at = u32(b, end + 16);
  const entries: ZipEntry[] = [];
  for (let n = 0; n < count; n++) {
    if (u32(b, at) !== 0x02014b50) throw new Error("bad zip directory");
    const nameLength = u16(b, at + 28);
    const extraLength = u16(b, at + 30);
    const commentLength = u16(b, at + 32);
    entries.push({
      method: u16(b, at + 10),
      compressedSize: u32(b, at + 20),
      localOffset: u32(b, at + 42),
      name: new TextDecoder().decode(b.subarray(at + 46, at + 46 + nameLength)),
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(b: Uint8Array, entry: ZipEntry): Promise<string> {
  const at = entry.localOffset;
  const start = at + 30 + u16(b, at + 26) + u16(b, at + 28);
  const data = b.subarray(start, start + entry.compressedSize);
  const raw = entry.method === 0 ? data : await inflateRaw(data);
  return new TextDecoder().decode(raw);
}

// --- XML (just enough: attributes, and the text of <t> and <v>) ----------------------------------

function attr(tag: string, name: string): string | null {
  const m = new RegExp("\\s" + name + '="([^"]*)"').exec(tag);
  return m ? decodeXml(m[1]) : null;
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

// The text of every <t> inside a fragment (a rich-text string has several runs).
function texts(fragment: string): string {
  let out = "";
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) out += decodeXml(m[1]);
  return out;
}

function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  const re = /<si>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(texts(m[1]));
  return out;
}

// "C12" → column 2 (0-based).
function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetRows(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  const rowRe = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(xml))) {
    const rowNumber = Number(attr(rm[0], "r") ?? rows.length + 1);
    const row: string[] = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(rm[2]))) {
      const tag = "<c " + cm[1] + ">";
      const ref = attr(tag, "r") ?? "";
      const type = attr(tag, "t");
      const body = cm[2] ?? "";
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = "";
      if (type === "s" && v !== undefined) value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = texts(body);
      else if (type === "b" && v !== undefined) value = v === "1" ? "TRUE" : "FALSE";
      else if (v !== undefined) value = cleanNumber(decodeXml(v));
      row[columnIndex(ref)] = value;
    }
    for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = "";
    while (rows.length < rowNumber - 1) rows.push([]);
    rows.push(row);
  }
  return rows;
}

// A spreadsheet stores 4 as "4" and sometimes as "4.0000000000000009": keep what a person typed.
function cleanNumber(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  const rounded = Math.round(n * 1e9) / 1e9;
  return String(rounded);
}

// --- The workbook ----------------------------------------------------------------------------

export async function readXlsx(bytes: Uint8Array): Promise<XlsxSheet[]> {
  const entries = zipEntries(bytes);
  const file = async (name: string) => {
    const entry = entries.find((e) => e.name === name);
    return entry ? readEntry(bytes, entry) : null;
  };
  const workbook = await file("xl/workbook.xml");
  if (!workbook) throw new Error("no xl/workbook.xml");
  const rels = (await file("xl/_rels/workbook.xml.rels")) ?? "";
  const targets = new Map<string, string>();
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) targets.set(id, target.replace(/^\/?xl\//, "").replace(/^\//, ""));
  }
  const shared = sharedStrings((await file("xl/sharedStrings.xml")) ?? "");
  const sheets: XlsxSheet[] = [];
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const name = attr(m[0], "name") ?? "Sheet";
    const rid = attr(m[0], "r:id");
    const target = rid ? targets.get(rid) : null;
    const xml = target ? await file("xl/" + target) : null;
    if (xml) sheets.push({ name, rows: sheetRows(xml, shared) });
  }
  return sheets;
}
