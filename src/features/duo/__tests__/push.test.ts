import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadQuietHours, saveQuietHours } from "../push";

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
}));
jest.mock("@/lib/env", () => ({ isExpoGo: true }));
jest.mock("@/src/shared/lib/supabase", () => ({
  supabase: { rpc: jest.fn(), functions: { invoke: jest.fn() } },
}));
jest.mock("@/src/shared/lib/observability/reportError", () => ({ reportError: jest.fn() }));
jest.mock("expo-constants", () => ({ expoConfig: { extra: {} } }));

describe("horas de silencio de Duo", () => {
  beforeEach(() => AsyncStorage.clear());

  it("por defecto silencia de 22:00 a 07:00", async () => {
    expect(await loadQuietHours()).toEqual({ enabled: true, start: 22, end: 7 });
  });

  it("guarda y recupera la configuración", async () => {
    await saveQuietHours({ enabled: false, start: 23, end: 8 });
    expect(await loadQuietHours()).toEqual({ enabled: false, start: 23, end: 8 });
  });
});
