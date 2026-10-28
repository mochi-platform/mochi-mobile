import { getBottomNavScreen, getVisibleTabs } from "../navigation";

const all = {
  partner_features_enabled: true,
  study_enabled: true,
  exercise_enabled: true,
  habits_enabled: true,
  cooking_enabled: true,
  mood_enabled: true,
  gratitude_enabled: true,
};

describe("getBottomNavScreen", () => {
  it("agrupa los módulos de bienestar bajo la misma pestaña", () => {
    for (const path of ["/wellness", "/exercise", "/habits", "/mood", "/gratitude", "/cooking"]) {
      expect(getBottomNavScreen(path)).toBe("wellness");
    }
  });
  it("resuelve las demás pestañas", () => {
    expect(getBottomNavScreen("/")).toBe("home");
    expect(getBottomNavScreen("/study")).toBe("study");
    expect(getBottomNavScreen("/mochi-duo-invite")).toBe("mochi-duo");
    expect(getBottomNavScreen("/profile")).toBe("profile");
    expect(getBottomNavScreen("/goals")).toBe("home");
  });
});

describe("getVisibleTabs", () => {
  it("con todo activo muestra las cinco pestañas en orden", () => {
    expect(getVisibleTabs(all)).toEqual(["home", "study", "wellness", "mochi-duo", "profile"]);
  });
  it("oculta Bienestar si ningún módulo de bienestar está activo", () => {
    const tabs = getVisibleTabs({
      ...all,
      exercise_enabled: false,
      habits_enabled: false,
      cooking_enabled: false,
      mood_enabled: false,
      gratitude_enabled: false,
    });
    expect(tabs).not.toContain("wellness");
  });
  it("Duo y Estudio dependen de sus ajustes; Perfil siempre está", () => {
    const tabs = getVisibleTabs({ ...all, partner_features_enabled: false, study_enabled: false });
    expect(tabs).toEqual(["home", "wellness", "profile"]);
  });
});
