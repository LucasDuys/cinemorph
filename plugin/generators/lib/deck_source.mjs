/**
 * deck_source.mjs — read a generated deck's source (stages, data, tokens).
 *
 * Node mirror of deck_source.py. Reads <deck>/src/deck/ for:
 *   1. JSON sidecars (stages.json, data.json, tokens.json) — preferred
 *   2. Regex extract from .ts files (fallback)
 */

import fs from "fs";
import path from "path";

export class DeckSource {
  constructor(deckPath, name, stages = [], data = {}, tokens = {}) {
    this.path = deckPath;
    this.name = name;
    this.stages = stages;
    this.data = data;
    this.tokens = tokens;
  }
}

const SOURCES = ["stages", "data", "tokens"];

/**
 * Read a deck's source files from <deck>/src/deck/.
 *
 * @param {string} deckPath - path to deck directory
 * @returns {DeckSource} with stages, data, tokens populated
 * @throws {Error} if <deck>/src/deck/stages.{ts,json} does not exist
 */
export function readDeckSource(deckPath) {
  const resolvedPath = path.resolve(deckPath);

  if (!fs.statSync(resolvedPath).isDirectory()) {
    throw new Error(`deck path is not a directory: ${resolvedPath}`);
  }

  const srcDeck = path.join(resolvedPath, "src", "deck");

  if (!hasSource(srcDeck, "stages")) {
    throw new Error(
      `missing stages source: expected ${path.join(srcDeck, "stages.json")} or ${path.join(srcDeck, "stages.ts")}`
    );
  }

  const name = deriveDeckName(resolvedPath);
  const stages = readArray(srcDeck, "stages");
  const data = readObject(srcDeck, "data");
  const tokens = readObject(srcDeck, "tokens");

  return new DeckSource(resolvedPath, name, stages, data, tokens);
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function hasSource(srcDeck, name) {
  const jsonPath = path.join(srcDeck, `${name}.json`);
  const tsPath = path.join(srcDeck, `${name}.ts`);
  return fs.existsSync(jsonPath) || fs.existsSync(tsPath);
}

function readArray(srcDeck, name) {
  const jsonPath = path.join(srcDeck, `${name}.json`);
  const tsPath = path.join(srcDeck, `${name}.ts`);

  if (fs.existsSync(jsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray(parsed[name.toUpperCase()])
      ) {
        return parsed[name.toUpperCase()];
      }
      console.warn(
        `${jsonPath}: expected JSON array (or {'${name.toUpperCase()}': [...]}), got ${typeof parsed}`
      );
      return [];
    } catch (e) {
      console.warn(`${jsonPath}: JSON parse failed (${e}); returning empty.`);
      return [];
    }
  }

  if (fs.existsSync(tsPath)) {
    const result = tsExtractArray(tsPath, name.toUpperCase());
    return result || [];
  }

  return [];
}

function readObject(srcDeck, name) {
  const jsonPath = path.join(srcDeck, `${name}.json`);
  const tsPath = path.join(srcDeck, `${name}.ts`);

  if (fs.existsSync(jsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }
      console.warn(
        `${jsonPath}: expected JSON object, got ${typeof parsed}`
      );
      return {};
    } catch (e) {
      console.warn(`${jsonPath}: JSON parse failed (${e}); returning empty.`);
      return {};
    }
  }

  if (fs.existsSync(tsPath)) {
    const result = tsExtractObject(tsPath);
    return result || {};
  }

  return {};
}

function tsExtractArray(tsPath, varName) {
  const text = fs.readFileSync(tsPath, "utf-8");
  const stripped = stripTsNoise(text);

  const pattern = new RegExp(
    `(?:export\\s+)?const\\s+${varName}\\s*(?::\\s*[^=]+?)?=\\s*\\[`,
    "m"
  );
  const m = pattern.exec(stripped);
  if (!m) {
    console.warn(
      `${tsPath}: could not locate \`const ${varName} = [...]\`; emit a JSON sidecar at compose time.`
    );
    return null;
  }

  const start = m.index + m[0].length - 1; // position of '['
  const body = balanceBrackets(stripped, start, "[", "]");
  if (body === null) {
    console.warn(
      `${tsPath}: failed to balance brackets for \`${varName}\`; emit a JSON sidecar instead.`
    );
    return null;
  }

  try {
    const parsed = tsLiteralToJson(body);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.warn(`${tsPath}: TS parse fallback failed (${e}); returning null.`);
  }

  return null;
}

function tsExtractObject(tsPath) {
  const text = fs.readFileSync(tsPath, "utf-8");
  const stripped = stripTsNoise(text);

  const pattern = /(?:export\s+)?const\s+\w+\s*(?::\s*[^=]+?)?\s*=\s*\{/m;
  const m = pattern.exec(stripped);
  if (!m) {
    console.warn(
      `${tsPath}: no \`const X = {...}\` literal found; emit a JSON sidecar at compose time.`
    );
    return null;
  }

  const start = m.index + m[0].length - 1; // position of '{'
  const body = balanceBrackets(stripped, start, "{", "}");
  if (body === null) {
    console.warn(`${tsPath}: failed to balance braces.`);
    return null;
  }

  try {
    const parsed = tsLiteralToJson(body);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.warn(`${tsPath}: TS parse fallback failed (${e}); returning null.`);
  }

  return null;
}

function stripTsNoise(text) {
  // block comments
  let result = text.replace(/\/\*.*?\*\//gs, "");
  // line comments (anything from // to end of line, but not inside http://)
  result = result.replace(/(^|[^:])\/\/[^\n]*/gm, "$1");
  return result;
}

function balanceBrackets(text, start, openCh, closeCh) {
  if (start >= text.length || text[start] !== openCh) return null;

  let depth = 0;
  let inStr = null;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inStr) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === inStr) {
        inStr = null;
      }
    } else {
      if (ch === '"' || ch === "'" || ch === "`") {
        inStr = ch;
      } else if (ch === openCh) {
        depth++;
      } else if (ch === closeCh) {
        depth--;
        if (depth === 0) {
          return text.substring(start, i + 1);
        }
      }
    }
  }

  return null;
}

function tsLiteralToJson(body) {
  let s = body;
  // Replace single-quoted strings with double-quoted
  s = convertSingleQuoted(s);
  // Unquoted keys: { foo: 1 } -> { "foo": 1 }
  s = s.replace(/([\{\,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*):/g, '$1"$2"$3:');
  // Trailing commas: ", }" -> " }" and ", ]" -> " ]"
  s = s.replace(/,(\s*[\}\]])/g, "$1");
  return JSON.parse(s);
}

function convertSingleQuoted(s) {
  const out = [];
  let i = 0;
  let inDq = false;
  let inBt = false;
  let escape = false;

  while (i < s.length) {
    const ch = s[i];

    if (escape) {
      out.push(ch);
      escape = false;
      i++;
      continue;
    }

    if (ch === "\\") {
      out.push(ch);
      escape = true;
      i++;
      continue;
    }

    if (inDq) {
      out.push(ch);
      if (ch === '"') inDq = false;
      i++;
      continue;
    }

    if (inBt) {
      out.push(ch);
      if (ch === "`") inBt = false;
      i++;
      continue;
    }

    if (ch === '"') {
      inDq = true;
      out.push(ch);
      i++;
      continue;
    }

    if (ch === "`") {
      inBt = true;
      out.push(ch);
      i++;
      continue;
    }

    if (ch === "'") {
      // consume single-quoted string up to next un-escaped '
      let j = i + 1;
      const buf = [];
      while (j < s.length) {
        const cj = s[j];
        if (cj === "\\" && j + 1 < s.length) {
          buf.push(cj);
          buf.push(s[j + 1]);
          j += 2;
          continue;
        }
        if (cj === "'") {
          break;
        }
        buf.push(cj);
        j++;
      }
      const inner = buf.join("").replace(/"/g, '\\"');
      out.push(`"${inner}"`);
      i = j + 1;
      continue;
    }

    out.push(ch);
    i++;
  }

  return out.join("");
}

function deriveDeckName(deckPath) {
  const pkgPath = path.join(deckPath, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const name = data.name;
      if (typeof name === "string" && name.trim()) {
        // Strip scope prefix like "@scope/foo" → "foo"
        return name.split("/").pop();
      }
    } catch {
      // fall through
    }
  }
  return path.basename(deckPath);
}
