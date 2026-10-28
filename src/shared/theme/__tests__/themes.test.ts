import { PALETTES } from "../palettes";
import { THEMES, canUseTheme, getTheme, themeVariables } from "../themes";

describe("themes", () => {
  it("el tema base es gratuito y los demás son premium", () => {
    expect(THEMES.filter((t) => !t.premium).map((t) => t.id)).toEqual(["base"]);
  });

  it("un tema premium exige plan que lo permita", () => {
    expect(canUseTheme(getTheme("menta"), false)).toBe(false);
    expect(canUseTheme(getTheme("menta"), true)).toBe(true);
    expect(canUseTheme(getTheme("base"), false)).toBe(true);
  });

  it("id desconocido cae al tema base", () => {
    expect(getTheme("inexistente").id).toBe("base");
    expect(getTheme(null).id).toBe("base");
  });

  it("genera las 22 variables de marca y el tema base replica Tailwind", () => {
    const base = themeVariables(getTheme("base"));
    expect(Object.keys(base)).toHaveLength(22);
    expect(base["--purple-500"]).toBe(PALETTES.purple[500]);
    expect(base["--pink-500"]).toBe(PALETTES.pink[500]);
  });

  it("un tema premium sustituye las escalas de marca", () => {
    const menta = themeVariables(getTheme("menta"));
    expect(menta["--purple-500"]).toBe(PALETTES.emerald[500]);
    expect(menta["--pink-500"]).toBe(PALETTES.teal[500]);
  });
});
