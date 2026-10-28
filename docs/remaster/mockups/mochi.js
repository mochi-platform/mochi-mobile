// Mochi vectorial (maqueta). viewBox 0 0 170 160. Fiel a assets/mochi/source/mochi-base.png
const INK = "#5A2F2F";
const BODY = "M85 64 C130 64 162 88 162 116 C162 140 128 149 85 149 C42 149 8 140 8 116 C8 88 40 64 85 64 Z";
const CAP =
  "M23 84 C16 66 30 48 52 44 C64 39 106 39 118 44 C141 50 154 66 147 84 C139 93 118 94 104 88 C97 85 91 84 85 86 C79 84 73 85 66 88 C52 94 31 93 23 84 Z";
const TOP =
  "M47 43 C47 22 64 7 86 7 C108 7 125 22 125 43 C121 53 110 55 101 51 C96 58 86 60 80 56 C73 59 62 57 60 51 C53 53 48 49 47 43 Z";

const EXPR = {
  happy:       { eyes: "round", mouth: "w",     blush: 1 },
  excited:     { eyes: "sparkle", mouth: "open", blush: 1.2, extra: "sparkles" },
  thinking:    { eyes: "look",  mouth: "o",     blush: 0.8, extra: "dots" },
  sleepy:      { eyes: "closedDown", mouth: "small", blush: 0.8, extra: "zzz" },
  proud:       { eyes: "arc",   mouth: "smug",  blush: 1.3 },
  worried:     { eyes: "round", brows: "up",  mouth: "wavy", blush: 0.7, extra: "sweat" },
  celebrating: { eyes: "arc",   mouth: "big",   blush: 1.3, extra: "confetti" },
  tired:       { eyes: "half",  mouth: "flat",  blush: 0.6 },
  focused:     { eyes: "focus", mouth: "small", blush: 0.8 },
  soft_sad:    { eyes: "teary", brows: "up",  mouth: "frown", blush: 0.9 },
  love:        { eyes: "heart", mouth: "w",     blush: 1.4, extra: "heart" },
};

function eyes(kind) {
  const L = [60, 96], R = [110, 96];
  const round = ([x, y], dx = 0, dy = 0) =>
    `<circle cx="${x}" cy="${y}" r="8.2" fill="${INK}"/><circle cx="${x + 2.6 + dx}" cy="${y - 2.8 + dy}" r="2.8" fill="#fff"/><circle cx="${x - 2.4 + dx}" cy="${y + 2.6 + dy}" r="1.2" fill="#fff" opacity=".8"/>`;
  const arc = ([x, y]) => `<path d="M${x - 7} ${y + 2} Q${x} ${y - 8} ${x + 7} ${y + 2}" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  const down = ([x, y]) => `<path d="M${x - 7} ${y - 1} Q${x} ${y + 6} ${x + 7} ${y - 1}" stroke="${INK}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  switch (kind) {
    case "round": return round(L) + round(R);
    case "look": return round(L, 1.5, -1.5) + round(R, 1.5, -1.5);
    case "sparkle":
      return [L, R].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${INK}"/><path d="M${x + 2.5} ${y - 6} l1.3 3 3 1.3 -3 1.3 -1.3 3 -1.3 -3 -3 -1.3 3 -1.3z" fill="#fff"/><circle cx="${x - 3}" cy="${y + 3}" r="1.6" fill="#fff"/>`).join("");
    case "arc": return arc(L) + arc(R);
    case "closedDown": return down(L) + down(R);
    case "half":
      return [L, R].map(([x, y]) => `<clipPath id="h${x}"><rect x="${x - 10}" y="${y}" width="20" height="12"/></clipPath><g clip-path="url(#h${x})"><circle cx="${x}" cy="${y}" r="8.2" fill="${INK}"/><circle cx="${x + 2.5}" cy="${y + 2}" r="1.8" fill="#fff"/></g><path d="M${x - 9} ${y + (x < 85 ? 1 : -2)} L${x + 9} ${y + (x < 85 ? -2 : 1)}" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`).join("");
    case "focus":
      return [L, R].map(([x, y]) => `<clipPath id="f${x}"><rect x="${x - 10}" y="${y - 4}" width="20" height="14"/></clipPath><g clip-path="url(#f${x})"><circle cx="${x}" cy="${y}" r="8.2" fill="${INK}"/><circle cx="${x + 2.5}" cy="${y - 0.5}" r="2.4" fill="#fff"/></g>`).join("");
    case "teary":
      return [L, R].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.6" fill="${INK}"/><circle cx="${x + 2.6}" cy="${y - 2.6}" r="3.2" fill="#fff"/><circle cx="${x - 2.6}" cy="${y + 2.6}" r="1.8" fill="#fff"/><path d="M${x - 7} ${y + 6} Q${x} ${y + 9} ${x + 7} ${y + 6}" stroke="#9FD3F0" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join("");
    case "heart":
      return [L, R].map(([x, y]) => `<path d="M${x} ${y + 7} C${x - 11} ${y - 1} ${x - 6} ${y - 10} ${x} ${y - 4} C${x + 6} ${y - 10} ${x + 11} ${y - 1} ${x} ${y + 7}Z" fill="#E2557F"/><circle cx="${x + 3}" cy="${y - 4}" r="1.5" fill="#fff"/>`).join("");
  }
}

function brows(kind) {
  if (!kind) return "";
  const up = kind === "up";
  return `<path d="M${52} ${up ? 84 : 83} L${66} ${up ? 80 : 86}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" transform="${up ? "rotate(-14 59 82)" : ""}"/>
          <path d="M${104} ${up ? 80 : 86} L${118} ${up ? 84 : 83}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round" transform="${up ? "rotate(14 111 82)" : ""}"/>`;
}

function mouth(kind) {
  const s = `stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  switch (kind) {
    case "w": return `<path d="M78 101 q3.5 5 7 0 q3.5 5 7 0" ${s}/>`;
    case "open": return `<path d="M78 101 Q85 113 92 101 Z" fill="${INK}"/><path d="M81 106 Q85 110 89 106" fill="#F08AA0"/>`;
    case "big": return `<path d="M75 100 Q85 118 95 100 Z" fill="${INK}"/><path d="M79 107 Q85 113 91 107" fill="#F08AA0"/>`;
    case "o": return `<ellipse cx="88" cy="104" rx="3.2" ry="3.8" fill="${INK}"/>`;
    case "small": return `<path d="M81 103 Q85 106 89 103" ${s}/>`;
    case "smug": return `<path d="M79 101 Q87 108 93 99" ${s}/>`;
    case "flat": return `<path d="M80 104 H90" ${s}/>`;
    case "wavy": return `<path d="M77 105 q2 -3 4 0 t4 0 t4 0 t4 0" ${s}/>`;
    case "frown": return `<path d="M80 106 Q85 101 90 106" ${s}/>`;
  }
}

function extra(kind) {
  switch (kind) {
    case "sparkles": return `<g fill="#F4C65A"><path d="M14 40 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z"/><path d="M152 30 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2z"/><path d="M160 64 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4z"/></g>`;
    case "zzz": return `<g fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".75"><path d="M14 30 h8 l-8 8 h8"/><path d="M28 18 h6 l-6 6 h6"/></g>`;
    case "dots": return `<g fill="${INK}" opacity=".55"><circle cx="140" cy="30" r="2.6"/><circle cx="150" cy="22" r="3.2"/><circle cx="161" cy="12" r="3.8"/></g>`;
    case "sweat": return `<path d="M146 70 C142 78 142 83 147 83 C152 83 152 78 146 70Z" fill="#9FD3F0" stroke="${INK}" stroke-width="1.6"/>`;
    case "confetti": return `<g><rect x="12" y="34" width="6" height="3" rx="1.5" fill="#F08AA0" transform="rotate(-30 15 35)"/><rect x="150" y="26" width="6" height="3" rx="1.5" fill="#B9A3E3" transform="rotate(25 153 27)"/><circle cx="24" cy="18" r="2.4" fill="#F4C65A"/><circle cx="156" cy="56" r="2.2" fill="#8FD0B5"/><rect x="138" y="8" width="5" height="2.6" rx="1.3" fill="#F4C65A" transform="rotate(-20 140 9)"/><circle cx="8" cy="64" r="2" fill="#B9A3E3"/></g>`;
    case "heart": return `<path d="M150 34 C142 28 145 20 150 24 C155 20 158 28 150 34Z" fill="#E2557F"/>`;
    default: return "";
  }
}

function mochiSVG(name = "happy", size = 160, opts = {}) {
  const e = EXPR[name];
  const id = "m" + Math.random().toString(36).slice(2, 7);
  const shadow = opts.shadow === false ? "" : `<ellipse cx="85" cy="152" rx="62" ry="5" fill="#5A2F2F" opacity=".10"/>`;
  return `<svg class="mochi ${opts.cls || ""}" width="${size}" height="${size * 160 / 170}" viewBox="0 0 170 160" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#FFF8EC"/><stop offset="1" stop-color="#F6E1CF"/></linearGradient>
    <linearGradient id="${id}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBDDF4"/><stop offset="1" stop-color="#D3BCE6"/></linearGradient>
    <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBD3D0"/><stop offset="1" stop-color="#F3A9A5"/></linearGradient>
    <filter id="${id}blur"><feGaussianBlur stdDeviation="1.4"/></filter>
  </defs>
  ${shadow}
  <g class="mochi-body">
  <g stroke="${INK}" stroke-width="7" stroke-linejoin="round" fill="${INK}"><path d="${BODY}"/><path d="${CAP}"/><path d="${TOP}"/></g>
  <path d="${BODY}" fill="url(#${id}b)"/>
  <path d="M30 120 C40 136 70 141 100 139" stroke="#fff" stroke-width="3" opacity=".5" fill="none" stroke-linecap="round"/>
  <path d="${CAP}" fill="url(#${id}c)"/>
  <path d="M40 74 C52 82 70 82 80 78" stroke="#C7AEDC" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>
  <path d="${TOP}" fill="url(#${id}t)"/>
  <path d="M60 46 C66 50 74 50 80 47" stroke="#EE9C98" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>
  <g fill="#fff"><circle cx="72" cy="17" r="2.6"/><circle cx="84" cy="19" r="2"/><circle cx="98" cy="18" r="2.4"/><circle cx="64" cy="29" r="2.2"/><circle cx="80" cy="32" r="1.4"/><circle cx="94" cy="33" r="2.1"/><circle cx="108" cy="28" r="1.5"/><circle cx="102" cy="43" r="2.3"/><circle cx="62" cy="40" r="2"/>
  <circle cx="36" cy="66" r="3" opacity=".9"/><circle cx="44" cy="78" r="2.4" opacity=".9"/><circle cx="85" cy="64" r="2.8"/><circle cx="118" cy="72" r="1.6"/><circle cx="135" cy="68" r="1.4"/><circle cx="140" cy="92" r="2.4" opacity=".8"/><circle cx="62" cy="122" r="2.4" opacity=".8"/></g>
  <circle cx="32" cy="106" r="2" fill="#D6C2EA"/>
  <g class="face">
    <ellipse cx="51" cy="106" rx="${7 * e.blush}" ry="${3.6 * e.blush}" fill="#F26D8F" opacity=".85" filter="url(#${id}blur)"/>
    <ellipse cx="119" cy="106" rx="${7 * e.blush}" ry="${3.6 * e.blush}" fill="#F26D8F" opacity=".85" filter="url(#${id}blur)"/>
    ${brows(e.brows)}${eyes(e.eyes)}${mouth(e.mouth)}
  </g>
  </g>
  ${extra(e.extra)}
</svg>`;
}

document.querySelectorAll("[data-mochi]").forEach((el) => {
  el.innerHTML = mochiSVG(el.dataset.mochi, Number(el.dataset.size || 160), { cls: el.dataset.cls || "", shadow: el.dataset.shadow !== "false" });
});
