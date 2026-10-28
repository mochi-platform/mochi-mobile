#!/usr/bin/env node
/**
 * Traduce clases de color sueltas (bg-purple-100, text-pink-700, border-teal-200…) a los tokens
 * del Remaster, sin tocar la estructura. Uso: node scripts/codemod-tokens.mjs archivo.tsx [...]
 *
 * - Quita variantes dark: (el modo oscuro está apagado tras la flag) y los bordes de color con su
 *   ancho (la estética no usa contornos; los separadores con border-line no se tocan).
 * - Fondos: 50 → zona hundida; 100–300 → tinte de su familia; 400–700 → acento (rojo → peligro,
 *   verdes → positivo); 800+ → tinta.
 * - Texto: 50–100 → claro sobre color; 200–500 → tinta secundaria; 600+ → tinta
 *   (rojo → peligro, verdes → positivo).
 */
import { readFileSync, writeFileSync } from "node:fs";

const FAMILY = {
  pink: "me", rose: "me", red: "me", fuchsia: "duo",
  purple: "study", violet: "study", indigo: "study",
  orange: "kitchen", amber: "kitchen", yellow: "kitchen",
  green: "ok", emerald: "ok", teal: "ok",
  sky: null, blue: null, slate: null, gray: null,
};
const HUES = Object.keys(FAMILY).join("|");
const RE = new RegExp(`^(bg|text|border)-(${HUES})-(\\d{2,3})$`);

function mapToken(tok) {
  const m = tok.match(RE);
  if (!m) return tok;
  const [, kind, hue, shadeStr] = m;
  const shade = Number(shadeStr);
  const fam = FAMILY[hue];
  const danger = hue === "red" || hue === "rose";
  const ok = hue === "green" || hue === "emerald" || hue === "teal";
  if (kind === "border") return null;
  if (kind === "bg") {
    if (shade <= 50) return "bg-surface-muted";
    if (shade <= 300) return fam ? `bg-tint-${fam}` : "bg-surface-muted";
    if (shade <= 700) return danger ? "bg-danger" : ok ? "bg-positive" : "bg-accent";
    return "bg-ink";
  }
  // text
  if (shade <= 100) return "text-accent-ink";
  if (danger && shade >= 400) return "text-danger";
  if (ok && shade >= 500) return "text-positive";
  if (shade <= 500) return "text-ink-muted";
  return "text-ink";
}

const BORDER_WIDTH = /^border(-[0-4])?$|^border-(t|b|l|r|x|y)(-[0-4])?$/;

function transformClassList(list) {
  const tokens = list.split(/\s+/).filter(Boolean).filter((t) => !t.startsWith("dark:"));
  const hadHueBorder = tokens.some((t) => /^border-[a-z]+-\d{2,3}$/.test(t) && RE.test(t));
  const out = [];
  for (const t of tokens) {
    if (t === "bg-white") {
      out.push("bg-surface");
      continue;
    }
    if (hadHueBorder && BORDER_WIDTH.test(t)) continue;
    const mapped = mapToken(t);
    if (mapped) out.push(mapped);
  }
  // Evita duplicados exactos que deja el mapeo (p. ej. dos text-ink).
  return [...new Set(out)].join(" ");
}

const CLASSY = /^[a-z0-9:\-\/\[\]\.% ]+$/;
const HAS_TARGET = new RegExp(`(^|\\s)(dark:|bg-white(\\s|$)|(bg|text|border)-(${HUES})-\\d{2,3})`);

function transform(source) {
  // Cualquier "cadena" hecha solo de clases (className, ternarios, mapas de configuración).
  let next = source.replace(/"([^"\n]*)"/g, (whole, list) =>
    CLASSY.test(list) && HAS_TARGET.test(list) ? `"${transformClassList(list)}"` : whole,
  );
  // Tramos literales de plantillas `...` fuera de ${...}.
  next = next.replace(/`([^`]*)`/g, (whole, body) => {
    if (!HAS_TARGET.test(body)) return whole;
    const parts = body.split(/(\$\{[^}]*\})/);
    return "`" + parts.map((p) => (p.startsWith("${") || !CLASSY.test(p.trim() || "x") ? p : (() => {
      const lead = p.match(/^\s*/)[0];
      const trail = p.match(/\s*$/)[0];
      const core = transformClassList(p);
      return core ? `${lead}${core}${trail}` : lead || trail;
    })())).join("") + "`";
  });
  return next;
}

for (const file of process.argv.slice(2)) {
  const before = readFileSync(file, "utf8");
  const after = transform(before);
  if (after !== before) {
    writeFileSync(file, after);
    console.log(`transformado: ${file}`);
  }
}
