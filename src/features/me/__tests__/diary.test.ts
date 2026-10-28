import { diaryDateLabel, mergeDiary } from "../diary";

describe("diario", () => {
  it("une ánimo y gratitud del mismo día y ordena del más reciente", () => {
    const days = mergeDiary(
      [
        { logged_date: "2026-10-27", mood: 4, note: null },
        { logged_date: "2026-10-26", mood: 2, note: "Día pesado" },
      ],
      [{ logged_date: "2026-10-27", entry_1: "el almuerzo con mi mamá", entry_2: null, entry_3: null }],
    );
    expect(days).toEqual([
      { date: "2026-10-27", mood: 4, text: "Agradezco el almuerzo con mi mamá." },
      { date: "2026-10-26", mood: 2, text: "Día pesado" },
    ]);
  });

  it("ignora filas sin fecha o vacías y respeta el límite", () => {
    const moods = Array.from({ length: 15 }, (_, i) => ({
      logged_date: `2026-10-${String(i + 1).padStart(2, "0")}`,
      mood: 3,
      note: null,
    }));
    expect(mergeDiary([...moods, { logged_date: null, mood: 5, note: null }], [], 10)).toHaveLength(10);
  });

  it("etiqueta hoy y ayer con la fecha local", () => {
    const now = new Date(2026, 9, 28, 21, 0);
    expect(diaryDateLabel("2026-10-28", now)).toBe("Hoy");
    expect(diaryDateLabel("2026-10-27", now)).toBe("Ayer");
  });
});
