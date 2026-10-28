import {
  buildRange,
  minuteOptions,
  formatTime,
  indexFromOffset,
  parseTime,
  periodOfDay,
  snapMinutes,
} from "../utils";

describe("timePicker utils", () => {
  it("parsea y acota la hora", () => {
    expect(parseTime("07:30")).toEqual({ hours: 7, minutes: 30 });
    expect(parseTime("")).toEqual({ hours: 0, minutes: 0 });
    expect(parseTime("99:99")).toEqual({ hours: 23, minutes: 59 });
    expect(parseTime("ab:cd")).toEqual({ hours: 0, minutes: 0 });
  });

  it("ajusta los minutos al paso más cercano", () => {
    expect(snapMinutes(3, 5)).toBe(5);
    expect(snapMinutes(2, 5)).toBe(0);
    expect(snapMinutes(58, 5)).toBe(55);
    expect(snapMinutes(37, 1)).toBe(37);
  });

  it("construye rangos con paso", () => {
    expect(buildRange(60, 15)).toEqual([0, 15, 30, 45]);
    expect(buildRange(24)).toHaveLength(24);
  });

  it("conserva el minuto original aunque no sea del paso", () => {
    expect(minuteOptions(5, 7)).toContain(7);
    expect(minuteOptions(5, 7)).toEqual([0, 5, 7, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    expect(minuteOptions(5, 10)).toHaveLength(12);
    expect(buildRange(60, 0)).toHaveLength(60);
  });

  it("formatea con ceros", () => {
    expect(formatTime(7, 5)).toBe("07:05");
  });

  it("calcula el índice centrado y lo acota", () => {
    expect(indexFromOffset(96, 48, 24)).toBe(2);
    expect(indexFromOffset(-30, 48, 24)).toBe(0);
    expect(indexFromOffset(99999, 48, 24)).toBe(23);
  });

  it("nombra el momento del día", () => {
    expect(periodOfDay(3)).toBe("Madrugada");
    expect(periodOfDay(7)).toBe("Mañana");
    expect(periodOfDay(15)).toBe("Tarde");
    expect(periodOfDay(21)).toBe("Noche");
  });
});
