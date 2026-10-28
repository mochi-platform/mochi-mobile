import { addManualPeriodStart } from "@/src/shared/lib/manualCycle";
import { handleWidgetTarget, WIDGET_TARGET_PERIOD_TODAY } from "../widgetActions";

jest.mock("@/src/shared/lib/manualCycle", () => ({
  addManualPeriodStart: jest.fn(async () => {}),
}));
jest.mock("@/src/shared/lib/observability/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/lib/env", () => ({ isExpoGo: false }));

const addStart = addManualPeriodStart as jest.Mock;

describe("widgetActions", () => {
  beforeEach(() => addStart.mockClear());

  it("registra el inicio del periodo de hoy y avisa", async () => {
    const done = jest.fn();
    await handleWidgetTarget(WIDGET_TARGET_PERIOD_TODAY, done);
    expect(addStart).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("ignora botones desconocidos", async () => {
    await handleWidgetTarget("otro", jest.fn());
    expect(addStart).not.toHaveBeenCalled();
  });
});
