import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button } from "../Button";
import { Chip } from "../Chip";
import { Input } from "../Input";
import { Toggle } from "../Toggle";

describe("Button", () => {
  it("llama onPress y expone el rol de botón", () => {
    const onPress = jest.fn();
    render(<Button title="Guardar" onPress={onPress} />);
    fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("no dispara onPress si está deshabilitado o cargando", () => {
    const onPress = jest.fn();
    const { rerender } = render(<Button title="Guardar" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole("button", { name: "Guardar" }));
    rerender(<Button title="Guardar" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("Chip", () => {
  it("refleja el estado seleccionado en accesibilidad", () => {
    render(<Chip label="Estudio" selected onPress={() => undefined} />);
    expect(screen.getByRole("button", { name: "Estudio", selected: true })).toBeTruthy();
  });
});

describe("Input", () => {
  it("muestra la etiqueta y el error", () => {
    render(<Input label="Correo" error="Obligatorio" value="" onChangeText={() => undefined} />);
    expect(screen.getByLabelText("Correo")).toBeTruthy();
    expect(screen.getByText("Obligatorio")).toBeTruthy();
  });
});

describe("Toggle", () => {
  it("notifica el cambio", () => {
    const onValueChange = jest.fn();
    render(<Toggle label="Recordatorios" value={false} onValueChange={onValueChange} />);
    fireEvent(screen.getByLabelText("Recordatorios"), "valueChange", true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
