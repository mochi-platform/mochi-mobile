import { fireEvent, render, screen } from "@testing-library/react-native";
import { MochiCanvas } from "../MochiCanvas";

describe("MochiCanvas", () => {
  it("es decorativa (oculta a lectores de pantalla) si no es interactiva", () => {
    render(<MochiCanvas expression="happy" size={120} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("al tocarla llama a onPress", () => {
    const onPress = jest.fn();
    render(<MochiCanvas expression="excited" size={120} onPress={onPress} />);
    fireEvent.press(screen.getByRole("button", { name: "Mochi" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ocupa en el layout exactamente su tamaño, sin contar el margen de animación", () => {
    render(<MochiCanvas expression="happy" size={170} onPress={() => undefined} />);
    expect(screen.getByRole("button").props.style).toMatchObject({ width: 170, height: 160 });
  });
});
