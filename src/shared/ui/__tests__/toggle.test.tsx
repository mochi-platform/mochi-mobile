import { fireEvent, render, screen } from "@testing-library/react-native";
import { Toggle } from "../Toggle";
import { StepProgress } from "@/src/features/onboarding/StepProgress";

jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn(async () => {}) }));

describe("Toggle", () => {
  it("expone el rol switch y su estado", () => {
    render(<Toggle label="Memoria" value onValueChange={() => {}} />);
    const el = screen.getByRole("switch", { name: "Memoria" });
    expect(el.props.accessibilityState.checked).toBe(true);
  });

  it("alterna el valor al tocar", () => {
    const onChange = jest.fn();
    render(<Toggle label="Memoria" value={false} onValueChange={onChange} />);
    fireEvent.press(screen.getByRole("switch", { name: "Memoria" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("StepProgress", () => {
  it("describe el paso actual", () => {
    render(<StepProgress index={2} total={8} />);
    expect(screen.getByLabelText("Paso 3 de 8")).toBeTruthy();
  });
});
