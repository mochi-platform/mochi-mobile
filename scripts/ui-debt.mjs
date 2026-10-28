#!/usr/bin/env node
/**
 * Freno a la deuda visual del Remaster (docs/DESIGN.md).
 * Cuenta patrones del diseño anterior y falla si alguno sube respecto a la línea base.
 * Al migrar pantallas las cifras bajan: actualiza la base con `node scripts/ui-debt.mjs --update`.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASELINE = join(ROOT, "scripts/ui-debt.baseline.json");
const HUES =
  "red|orange|amber|yellow|green|emerald|teal|sky|blue|indigo|violet|fuchsia|rose|slate|gray|purple|pink";

/** Lugares donde los colores literales son legítimos (definición de tokens, arte de Mochi, widget). */
const HEX_ALLOWED = ["src/shared/theme/", "src/shared/mochi/", "src/shared/widgets/"];

const METRICS = {
  hueClasses: { re: new RegExp(`\\b(?:dark:)?(?:bg|text|border)-(?:${HUES})-\\d{2,3}\\b`, "g") },
  hexColors: { re: /["'`]#[0-9a-fA-F]{3,8}["'`]/g, skip: (f) => HEX_ALLOWED.some((p) => f.startsWith(p)) },
  tcCalls: { re: /\btc\(/g, skip: (f) => f.startsWith("src/shared/theme/") },
  touchableOpacity: { re: /<TouchableOpacity\b/g },
  supabaseInScreens: { re: /\bsupabase\s*\.\s*(?:from|rpc|functions|storage)\b/g, only: (f) => f.startsWith("app/") },
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const files = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "src"))].map((f) => relative(ROOT, f));
const counts = Object.fromEntries(Object.keys(METRICS).map((k) => [k, 0]));
for (const file of files) {
  const text = readFileSync(join(ROOT, file), "utf8");
  for (const [key, m] of Object.entries(METRICS)) {
    if (m.skip?.(file) || (m.only && !m.only(file))) continue;
    counts[key] += text.match(m.re)?.length ?? 0;
  }
}

if (process.argv.includes("--update")) {
  writeFileSync(BASELINE, JSON.stringify(counts, null, 2) + "\n");
  console.log("Línea base actualizada:", counts);
  process.exit(0);
}

const base = JSON.parse(readFileSync(BASELINE, "utf8"));
const worse = Object.keys(counts).filter((k) => counts[k] > (base[k] ?? 0));
for (const k of Object.keys(counts)) {
  const delta = counts[k] - (base[k] ?? 0);
  console.log(`${k.padEnd(18)} ${String(counts[k]).padStart(5)}  (${delta > 0 ? "+" : ""}${delta})`);
}
if (worse.length > 0) {
  console.error(`\nLa deuda visual subió en: ${worse.join(", ")}. Usa tokens y componentes de src/shared/ui.`);
  process.exit(1);
}
const better = Object.keys(counts).some((k) => counts[k] < (base[k] ?? 0));
if (better) console.log("\nBajó la deuda: actualiza la base con `node scripts/ui-debt.mjs --update`.");
