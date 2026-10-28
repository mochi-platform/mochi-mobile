import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearOnboardingDraft, draftKey } from "../draft";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
}));

describe("borrador del onboarding", () => {
  beforeEach(() => AsyncStorage.clear());

  it("la clave es por usuaria", () => {
    expect(draftKey("a")).not.toBe(draftKey("b"));
  });

  it("borra solo el borrador indicado", async () => {
    await AsyncStorage.multiSet([
      [draftKey("a"), "1"],
      [draftKey("b"), "2"],
    ]);
    await clearOnboardingDraft("a");
    expect(await AsyncStorage.getItem(draftKey("a"))).toBeNull();
    expect(await AsyncStorage.getItem(draftKey("b"))).toBe("2");
  });

  it("al cerrar sesión borra todos los borradores y nada más", async () => {
    await AsyncStorage.multiSet([
      [draftKey("a"), "1"],
      [draftKey("b"), "2"],
      ["otra:clave", "x"],
    ]);
    await clearOnboardingDraft();
    expect(await AsyncStorage.getItem(draftKey("a"))).toBeNull();
    expect(await AsyncStorage.getItem(draftKey("b"))).toBeNull();
    expect(await AsyncStorage.getItem("otra:clave")).toBe("x");
  });
});
