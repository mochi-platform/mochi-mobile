import { AIError, callMochiAI, energyProfileFromPhase, getDailyMotivation } from "../ai";

jest.mock("@/src/shared/lib/supabase", () => ({
  supabase: {
    auth: { getSession: jest.fn(async () => ({ data: { session: { access_token: "jwt" } } })) },
  },
}));
jest.mock("@/src/shared/lib/observability/analytics", () => ({ track: jest.fn() }));
jest.mock("@/src/shared/lib/observability/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
}));

const mockFetch = (status: number, body: unknown) =>
  jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);

afterEach(() => jest.restoreAllMocks());

describe("energyProfileFromPhase (privacidad)", () => {
  it("nunca devuelve la fase, solo un perfil genérico", () => {
    expect(energyProfileFromPhase("menstrual")).toBe("baja");
    expect(energyProfileFromPhase("lutea")).toBe("baja");
    expect(energyProfileFromPhase("folicular")).toBe("alta");
    expect(energyProfileFromPhase("ovulatoria")).toBe("alta");
    expect(energyProfileFromPhase("unknown")).toBeUndefined();
    expect(energyProfileFromPhase(null)).toBeUndefined();
  });
});

describe("callMochiAI", () => {
  it("envía task+input con el JWT y devuelve el resultado", async () => {
    const spy = mockFetch(200, { result: "hola" });
    await expect(callMochiAI("cooking_help", { a: 1 })).resolves.toBe("hola");
    const [, init] = spy.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer jwt" });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      task: "cooking_help",
      input: { a: 1 },
    });
  });

  it("mapea 402 a RATE_LIMIT", async () => {
    mockFetch(402, { error: { message: "Sin créditos", code: "no_credits" } });
    await expect(callMochiAI("recipe", {})).rejects.toMatchObject({ code: "RATE_LIMIT" });
  });

  it("mapea salida inválida a PARSE_ERROR", async () => {
    mockFetch(502, { error: { code: "invalid_output" } });
    await expect(callMochiAI("recipe", {})).rejects.toMatchObject({ code: "PARSE_ERROR" });
  });

  it("falla de red => NETWORK reintentable", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const error = await callMochiAI("recipe", {}).catch((e) => e);
    expect(error).toBeInstanceOf(AIError);
    expect(error).toMatchObject({ code: "NETWORK", retryable: true });
  });
});

describe("getDailyMotivation", () => {
  it("si la IA falla, devuelve un mensaje local sin lanzar", async () => {
    mockFetch(500, { error: {} });
    const msg = await getDailyMotivation(2, true, "morning");
    expect(msg).toContain("2 bloques");
  });
});
