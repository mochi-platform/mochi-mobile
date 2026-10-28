// Inserta en global.css las escalas de color por defecto (valores de Tailwind) como variables CSS.
// Uso: node scripts/gen-palette.js
const fs = require("fs");
const path = require("path");
const colors = require("tailwindcss/colors");

const HUES = ["red", "orange", "amber", "yellow", "green", "emerald", "teal", "sky", "blue", "indigo", "violet", "fuchsia", "rose", "slate", "gray"];
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(" ");
};

let block = "  /* >>> escalas-base (generado por scripts/gen-palette.js; no editar a mano) */\n";
for (const hue of HUES) for (const shade of SHADES) block += `  --${hue}-${shade}: ${rgb(colors[hue][shade])};\n`;
block += "  /* <<< escalas-base */\n";

const file = path.join(__dirname, "..", "global.css");
let css = fs.readFileSync(file, "utf8");
const re = /  \/\* >>> escalas-base[\s\S]*?<<< escalas-base \*\/\n/;
css = re.test(css) ? css.replace(re, block) : css.replace("  --color-canvas:", block + "  --color-canvas:");
fs.writeFileSync(file, css);
console.log(`global.css actualizado: ${HUES.length} escalas`);
module.exports = { HUES };
