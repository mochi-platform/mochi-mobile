import { fireEvent, render, screen } from "@testing-library/react-native";
import { Toggle } from "../Toggle";

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
