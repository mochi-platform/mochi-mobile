import { CHECKIN_REPLY, GREETING_QUESTION, pickLine, timeOfDay } from "../lines";

describe("frases de Mochi", () => {
  it("timeOfDay corta a las 12 y a las 19", () => {
    expect(timeOfDay(new Date(2026, 9, 28, 8))).toBe("manana");
    expect(timeOfDay(new Date(2026, 9, 28, 12))).toBe("tarde");
    expect(timeOfDay(new Date(2026, 9, 28, 19))).toBe("noche");
  });

  it("pickLine es estable para la misma semilla", () => {
    const lines = GREETING_QUESTION.manana;
    expect(pickLine(lines, "2026-10-28")).toBe(pickLine(lines, "2026-10-28"));
    expect(lines).toContain(pickLine(lines, "otra"));
  });

  it("ninguna frase menciona el ciclo ni usa emojis", () => {
    const all = [...Object.values(GREETING_QUESTION), ...Object.values(CHECKIN_REPLY)].flat();
    for (const line of all) {
      expect(line).not.toMatch(/ciclo|regla|menstru|fase|período|periodo/i);
      expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
