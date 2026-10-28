// Caritas de ánimo (1-5), barra de estado y barra inferior compartidas por las maquetas.
function moodFace(level, size = 30, color = "#5A2F2F") {
  const fills = { 1: "#D9CCE9", 2: "#E7D9EC", 3: "#F6E7D8", 4: "#FAD9DD", 5: "#F7C6D3" };
  const mouths = {
    1: `<path d="M11 21 Q15 17 19 21" />`,
    2: `<path d="M11 20 H19" />`,
    3: `<path d="M11 19 Q15 21 19 19" />`,
    4: `<path d="M10.5 18.5 Q15 23 19.5 18.5" />`,
    5: `<path d="M10 18 Q15 25 20 18 Z" fill="${color}"/>`,
  };
  const eyes = level === 5
    ? `<path d="M8.5 13.5 q2 -3 4 0 M17.5 13.5 q2 -3 4 0" />`
    : level === 1
    ? `<path d="M8.5 14.5 q2 1.6 4 0 M17.5 14.5 q2 1.6 4 0" />`
    : `<circle cx="10.5" cy="14" r="1.6" fill="${color}" stroke="none"/><circle cx="19.5" cy="14" r="1.6" fill="${color}" stroke="none"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="${fills[level]}"/>
  <g stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round">${eyes}${mouths[level]}</g>
  ${level >= 4 ? `<ellipse cx="7.5" cy="18" rx="2.2" ry="1.2" fill="#F26D8F" opacity=".5"/><ellipse cx="22.5" cy="18" rx="2.2" ry="1.2" fill="#F26D8F" opacity=".5"/>` : ""}</svg>`;
}
document.querySelectorAll("[data-face]").forEach((el) => {
  el.innerHTML = moodFace(Number(el.dataset.face), Number(el.dataset.size || 30), el.dataset.color || "#5A2F2F");
});

const TABS = {
  hoy: ["Hoy", "sunny"],
  estudio: ["Estudio", "book"],
  cocina: ["Cocina", "restaurant"],
  yo: ["Yo", "flower"],
  duo: ["Duo", "heart"],
};
document.querySelectorAll("[data-tabbar]").forEach((el) => {
  const [list, active] = el.dataset.tabbar.split(":");
  el.className = "tabbar";
  el.innerHTML = list.split(",").map((k) => {
    const [label, icon] = TABS[k];
    const on = k === active;
    return `<div class="tab ${on ? "on" : ""}"><div class="ic"><ion-icon name="${icon}${on ? "" : "-outline"}"></ion-icon></div>${label}</div>`;
  }).join("");
});
document.querySelectorAll("[data-status]").forEach((el) => {
  el.className = "status";
  el.innerHTML = `<span>${el.dataset.status || "9:41"}</span><span><ion-icon name="cellular"></ion-icon><ion-icon name="wifi"></ion-icon><ion-icon name="battery-full" style="font-size:20px"></ion-icon></span>`;
});
