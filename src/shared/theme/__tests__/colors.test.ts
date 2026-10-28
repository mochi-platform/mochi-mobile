import { Appearance } from "react-native";

describe("tc() con el modo oscuro apagado (por defecto)", () => {
  it("no invierte colores aunque el sistema esté en oscuro", () => {
    jest.resetModules();
    jest.spyOn(Appearance, "getColorScheme").mockReturnValue("dark");
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- se importa tras resetModules para releer la flag
    const { tc } = require("../colors");
    expect(tc("#7c3aed")).toBe("#7c3aed");
  });

  it("invierte luminosidad con la flag activa y el sistema en oscuro", () => {
    jest.resetModules();
    jest.doMock("@/src/shared/config/flags", () => ({ DARK_MODE_ENABLED: true }));
    jest.spyOn(Appearance, "getColorScheme").mockReturnValue("dark");
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- ídem
    const { tc } = require("../colors");
    expect(tc("#ffffff")).not.toBe("#ffffff");
  });
});
