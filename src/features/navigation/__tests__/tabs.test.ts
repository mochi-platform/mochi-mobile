import { activeTabFor, tabsFor } from "../tabs";

const all = { study_enabled: true, cooking_enabled: true, partner_features_enabled: true };
const keys = (v: typeof all, mode?: "personal" | "partner") => tabsFor(v, mode).map((t) => t.key);

describe("tabsFor", () => {
  it("con todo activo muestra las 5 pestañas", () => {
    expect(keys(all)).toEqual(["hoy", "estudio", "cocina", "yo", "duo"]);
  });

  it("sin estudio ni Duo deja Hoy · Cocina · Yo", () => {
    expect(keys({ ...all, study_enabled: false, partner_features_enabled: false })).toEqual([
      "hoy",
      "cocina",
      "yo",
    ]);
  });

  it("en modo pareja muestra Hoy · Duo · Yo sin importar los módulos", () => {
    expect(keys({ ...all, study_enabled: false }, "partner")).toEqual(["hoy", "duo", "yo"]);
  });
});

describe("activeTabFor", () => {
  it.each([
    ["/", "hoy"],
    ["/study", "estudio"],
    ["/cooking", "cocina"],
    ["/me", "yo"],
    ["/habits", "yo"],
    ["/wellness", "yo"],
    ["/mochi-duo", "duo"],
  ])("%s → %s", (path, tab) => {
    expect(activeTabFor(path)).toBe(tab);
  });

  it("oculta la barra en pantallas de detalle", () => {
    expect(activeTabFor("/profile")).toBeNull();
    expect(activeTabFor("/study-timer")).toBeNull();
    expect(activeTabFor("/mochi-duo-invite")).toBeNull();
  });
});
