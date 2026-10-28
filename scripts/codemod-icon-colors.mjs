#!/usr/bin/env node
/**
 * Traduce colores de íconos sueltos — tc("#7c3aed") y props color="#..." /
 * placeholderTextColor="#..." — a COLORS de src/shared/theme/tokens.ts, según el tono:
 * grises → tintas, rosas/lilas/azules → acento, verdes → positivo, naranjas/amarillos →
 * advertencia, rojos → peligro, muy claros → tinta tenue, blanco → accentInk.
 * Uso: node scripts/codemod-icon-colors.mjs archivo.tsx [...]
 */
import { readFileSync, writeFileSync } from "node:fs";

function hsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s, l };
}

export function tokenFor(hex) {
  const v = hex.toLowerCase();
  if (v === "#ffffff" || v === "#fff") return "COLORS.accentInk";
  const { h, s, l } = hsl(v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v);
  if (l < 0.2) return "COLORS.ink";
  if (s < 0.3) return l < 0.3 ? "COLORS.ink" : l > 0.75 ? "COLORS.inkFaint" : "COLORS.inkMuted";
  if (l > 0.8) return "COLORS.inkFaint";
  if (h < 15 || h >= 345) return l < 0.6 ? "COLORS.danger" : "COLORS.accent";
  if (h < 65) return "COLORS.warning";
  if (h < 190) return "COLORS.positive";
  return "COLORS.accent";
}

const IMPORT = 'import { COLORS } from "@/src/shared/theme/tokens";';

for (const file of process.argv.slice(2)) {
  const before = readFileSync(file, "utf8");
  let after = before.replace(/\btc\(\s*"(#[0-9a-fA-F]{3,6})"\s*\)/g, (_, hex) => tokenFor(hex));
  after = after.replace(/\b(color|placeholderTextColor|iconColor|loadingColor)=("|')(#[0-9a-fA-F]{6})\2/g, (_, prop, _q, hex) => `${prop}={${tokenFor(hex)}}`);
  if (after === before) continue;
  if (!after.includes(IMPORT) && !/import \{[^}]*\bCOLORS\b[^}]*\} from "@\/src\/shared\/theme\/tokens"/.test(after)) {
    after = `${IMPORT}\n${after}`;
  }
  if (!/\btc\(/.test(after)) {
    after = after.replace(/^import \{ tc \} from "@\/src\/shared\/theme\/colors";\n/m, "");
  }
  writeFileSync(file, after);
  console.log(`transformado: ${file}`);
}
