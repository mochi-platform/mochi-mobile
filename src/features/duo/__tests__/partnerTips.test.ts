import { PARTNER_TIPS, tipFor } from "../partnerTips";

describe("consejos para la pareja", () => {
  it("nunca mencionan el ciclo, la fase ni datos de salud", () => {
    for (const tip of Object.values(PARTNER_TIPS).flat()) {
      expect(tip).not.toMatch(/ciclo|fase|regla|menstru|periodo|período|lútea|ovula|hormon/i);
      expect(tip).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it("tipFor es estable para el mismo día y pertenece a su nivel", () => {
    expect(tipFor("baja", "2026-10-28")).toBe(tipFor("baja", "2026-10-28"));
    expect(PARTNER_TIPS.alta).toContain(tipFor("alta", "2026-10-29"));
  });
});
