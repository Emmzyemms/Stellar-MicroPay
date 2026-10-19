/**
 * __tests__/i18n-key-coverage.test.ts
 *
 * Regression guards added for #1458 (hardcoded strings bypassing i18n).
 *
 * 1. Key coverage: every translation key passed to `t()` in `components/` and
 *    `pages/` must resolve against `locales/en.json` (either as a leaf string
 *    or as a plural group with `one`/`other` children). A typo or a key that
 *    was never added to the catalog fails here instead of silently rendering
 *    a raw dotted key in the UI.
 *
 * 2. Hardcoded-string guard: new JSX text literals or `aria-label` attributes
 *    containing prose must be routed through the catalogs. The scans are
 *    line-based heuristics — a lint rule was considered but a custom ESLint
 *    rule needs the JSX AST to avoid false positives on TS generics and
 *    comparisons, which is disproportionate for this codebase; the handful of
 *    legitimate technical exceptions are kept in the allowlists below so any
 *    new violation fails the suite.
 */

import fs from "fs";
import path from "path";
import en from "@/locales/en.json";

const FRONTEND_ROOT = path.join(__dirname, "..");
const SOURCE_DIRS = ["components", "pages"];

/** JSX text literals that are legitimate exceptions (technical tokens / brand). */
const ALLOWED_JSX_TEXT = new Set(["Insufficient history", "Stellar MicroPay"]);

/** Hardcoded aria-labels that are legitimate exceptions (brand names). */
const ALLOWED_ARIA_LABELS = new Set(["GitHub"]);

function listTsxFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsxFiles(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}

function sourceFiles(): string[] {
  return SOURCE_DIRS.flatMap((dir) => listTsxFiles(path.join(FRONTEND_ROOT, dir)));
}

function relative(file: string): string {
  return path.relative(FRONTEND_ROOT, file);
}

/** Flatten a nested catalog into dot-path keys. */
function collectKeys(node: unknown, prefix = ""): string[] {
  if (typeof node !== "object" || node === null) return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    collectKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

const CATALOG_KEYS = new Set(collectKeys(en));

/** `t("some.key")` / `t('some.key')` call sites. */
const T_KEY_PATTERN = /\bt\(\s*["']([A-Za-z0-9_.]+)["']/g;

/** Multi-word capitalized prose between JSX tags, e.g. `>Send Payment</`. */
const JSX_TEXT_PATTERN = />([ \t]*[A-Z][A-Za-z0-9'’]*(?:[ \t]+[A-Za-z0-9'’]+)+[ \t]*)<\//g;

/** `aria-label="..."` attributes. */
const ARIA_LABEL_PATTERN = /aria-label="([^"]+)"/g;

describe("i18n key coverage (#1458)", () => {
  it("resolves every t() key used in components/pages against en.json", () => {
    const missing: string[] = [];

    for (const file of sourceFiles()) {
      const source = fs.readFileSync(file, "utf-8");
      for (const match of source.matchAll(T_KEY_PATTERN)) {
        const key = match[1];
        const isPluralGroup = [...CATALOG_KEYS].some((k) =>
          k.startsWith(`${key}.`)
        );

        if (!CATALOG_KEYS.has(key) && !isPluralGroup) {
          missing.push(`${relative(file)} → ${key}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});

describe("no new hardcoded UI strings (#1458)", () => {
  it("flags JSX text literals that bypass the catalogs", () => {
    const violations: string[] = [];

    for (const file of sourceFiles()) {
      const lines = fs.readFileSync(file, "utf-8").split("\n");
      lines.forEach((line, index) => {
        for (const match of line.matchAll(JSX_TEXT_PATTERN)) {
          const text = match[1].trim();
          if (!ALLOWED_JSX_TEXT.has(text)) {
            violations.push(`${relative(file)}:${index + 1} → "${text}"`);
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it("flags hardcoded aria-labels that bypass the catalogs", () => {
    const violations: string[] = [];

    for (const file of sourceFiles()) {
      const lines = fs.readFileSync(file, "utf-8").split("\n");
      lines.forEach((line, index) => {
        for (const match of line.matchAll(ARIA_LABEL_PATTERN)) {
          const label = match[1];
          if (!ALLOWED_ARIA_LABELS.has(label)) {
            violations.push(`${relative(file)}:${index + 1} → "${label}"`);
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
