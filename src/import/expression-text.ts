// Reading scope and trigger conditions written as text, and writing them back.
// Design: design/rules-overlay.md §17 (reaches, in force; route patterns `raised_at > in*`),
// design/text-format-and-csv.md §1 (concept drives the format; the review reads it back).
// The text shape is a slice-0 proposal, recorded in build/build-log.md.
//
// Forms:
//   reaches(nuln, raised_at > in*)            one thing, as of the rule's read date
//   reaches(any title, serves > under*)       any thing of a kind
//   reaches(siege_of_nuln, participated_in, ever)
//   in_force(wages_withheld, withholder = wissenland_treasury)
//   all(a, b)   any(a, b)   not(a)
//   commissioned_by_the_treasury             a bare key: a named scope
//   reaches("Gunnery School", member_of)     a label in quotes; the import matches it to a key
//   (slice 1 brief §2.3, references by label; text-format §3)

import type { Expression, RouteStep } from "../schema";

type Token = { type: "word"; text: string } | { type: "symbol"; text: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /\s*(?:"([^"]*)"|([A-Za-z0-9_.:'-]+)|([(),=>*→]))/y;
  let match: RegExpExecArray | null;
  while (pattern.lastIndex < text.length && (match = pattern.exec(text)) !== null) {
    if (match[1] !== undefined) tokens.push({ type: "word", text: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: "word", text: match[2] });
    else tokens.push({ type: "symbol", text: match[3] === "→" ? ">" : match[3] });
  }
  if (text.slice(pattern.lastIndex).trim() !== "") {
    throw new Error("can't read “" + text.slice(pattern.lastIndex).trim() + "”");
  }
  return tokens;
}

// Reads a condition. Throws an Error with a plain message if it can't.
export function parseExpression(text: string): Expression {
  const reader = new TokenReader(tokenize(text));
  const expression = readExpression(reader);
  if (!reader.atEnd()) throw new Error("unexpected “" + reader.peek()!.text + "” after the condition");
  return expression;
}

class TokenReader {
  private index = 0;
  constructor(private tokens: Token[]) {}
  peek(): Token | undefined {
    return this.tokens[this.index];
  }
  next(): Token {
    const token = this.tokens[this.index++];
    if (!token) throw new Error("the condition ends too early");
    return token;
  }
  atEnd(): boolean {
    return this.index >= this.tokens.length;
  }
  isSymbol(text: string): boolean {
    const token = this.peek();
    return token?.type === "symbol" && token.text === text;
  }
  expectSymbol(text: string): void {
    const token = this.next();
    if (token.type !== "symbol" || token.text !== text) throw new Error("expected “" + text + "”, found “" + token.text + "”");
  }
  word(): string {
    const token = this.next();
    if (token.type !== "word") throw new Error("expected a name, found “" + token.text + "”");
    return token.text;
  }
}

function readExpression(reader: TokenReader): Expression {
  const name = reader.word();
  if (!reader.isSymbol("(")) return { node: "named_scope", key: name };
  reader.expectSymbol("(");
  let expression: Expression;
  switch (name) {
    case "reaches":
      expression = readReaches(reader);
      break;
    case "in_force":
      expression = readInForce(reader);
      break;
    case "all":
    case "any":
      expression = { node: name, of: readList(reader) };
      break;
    case "not":
      expression = { node: "not", of: readExpression(reader) };
      break;
    default:
      throw new Error("unknown condition “" + name + "”");
  }
  reader.expectSymbol(")");
  return expression;
}

function readList(reader: TokenReader): Expression[] {
  const parts = [readExpression(reader)];
  while (reader.isSymbol(",")) {
    reader.next();
    parts.push(readExpression(reader));
  }
  return parts;
}

function readReaches(reader: TokenReader): Expression {
  const first = reader.word();
  const target =
    first === "any" && reader.peek()?.type === "word"
      ? ({ by: "kind", kind: reader.word() } as const)
      : ({ by: "thing", key: first } as const);
  reader.expectSymbol(",");
  const via = readRoute(reader);
  let when: "as_of" | "ever" = "as_of";
  if (reader.isSymbol(",")) {
    reader.next();
    const word = reader.word();
    if (word !== "ever" && word !== "as_of") throw new Error("expected “ever” or “as_of”, found “" + word + "”");
    when = word;
  }
  return { node: "reaches", target, via, when };
}

function readRoute(reader: TokenReader): RouteStep[] {
  const steps: RouteStep[] = [readRouteStep(reader)];
  while (reader.isSymbol(">")) {
    reader.next();
    steps.push(readRouteStep(reader));
  }
  return steps;
}

function readRouteStep(reader: TokenReader): RouteStep {
  const link = reader.word();
  if (reader.isSymbol("*")) {
    reader.next();
    return { link, repeat: true };
  }
  return { link, repeat: false };
}

function readInForce(reader: TokenReader): Expression {
  const what = reader.word();
  const roles: Record<string, string> = {};
  while (reader.isSymbol(",")) {
    reader.next();
    const role = reader.word();
    reader.expectSymbol("=");
    roles[role] = reader.word();
  }
  return { node: "in_force", what, roles };
}

// --- Writing back (canonical form) ----------------------------------------------------

// A key is written bare; anything else (a label not yet matched) in quotes.
export function looksLikeKey(text: string): boolean {
  return /^[a-z0-9_.:-]+$/.test(text);
}

function name(text: string): string {
  return looksLikeKey(text) ? text : JSON.stringify(text);
}

export function expressionToText(expression: Expression): string {
  switch (expression.node) {
    case "reaches": {
      const target = expression.target.by === "thing" ? name(expression.target.key) : "any " + expression.target.kind;
      const route = expression.via.map((step) => step.link + (step.repeat ? "*" : "")).join(" > ");
      return "reaches(" + target + ", " + route + (expression.when === "ever" ? ", ever" : "") + ")";
    }
    case "in_force": {
      const roles = Object.entries(expression.roles).map(([role, key]) => ", " + role + " = " + name(key));
      return "in_force(" + expression.what + roles.join("") + ")";
    }
    case "named_scope":
      return name(expression.key);
    case "all":
    case "any":
      return expression.node + "(" + expression.of.map(expressionToText).join(", ") + ")";
    case "not":
      return "not(" + expressionToText(expression.of) + ")";
  }
}

// Every place in a condition that names a thing or a named scope, with a way to change it.
// Used to match labels to keys on import.
export interface ConditionRef {
  kind: "thing" | "scope";
  written: string;
  set(key: string): void;
}

export function conditionRefs(expression: Expression): ConditionRef[] {
  const refs: ConditionRef[] = [];
  const visit = (e: Expression): void => {
    if (e.node === "reaches" && e.target.by === "thing") {
      const target = e.target;
      refs.push({ kind: "thing", written: target.key, set: (key) => (target.key = key) });
    }
    if (e.node === "in_force") {
      for (const role of Object.keys(e.roles)) {
        const roles = e.roles;
        refs.push({ kind: "thing", written: roles[role], set: (key) => (roles[role] = key) });
      }
    }
    if (e.node === "named_scope") {
      const scope = e;
      refs.push({ kind: "scope", written: scope.key, set: (key) => (scope.key = key) });
    }
    if (e.node === "all" || e.node === "any") e.of.forEach(visit);
    if (e.node === "not") visit(e.of);
  };
  visit(expression);
  return refs;
}

// Every thing key a condition refers to (for "missing reference" checks).
export function referencedKeys(expression: Expression): { things: string[]; scopes: string[] } {
  const things: string[] = [];
  const scopes: string[] = [];
  const visit = (e: Expression): void => {
    if (e.node === "reaches" && e.target.by === "thing") things.push(e.target.key);
    if (e.node === "in_force") things.push(...Object.values(e.roles));
    if (e.node === "named_scope") scopes.push(e.key);
    if (e.node === "all" || e.node === "any") e.of.forEach(visit);
    if (e.node === "not") visit(e.of);
  };
  visit(expression);
  return { things, scopes };
}
