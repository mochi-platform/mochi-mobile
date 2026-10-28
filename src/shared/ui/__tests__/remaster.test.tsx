import { Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ListGroup, ListRow } from "../ListGroup";
import { MochiBubble } from "../MochiBubble";
import { PressableScale } from "../PressableScale";
import { ProgressRing } from "../ProgressRing";
import { SectionHeader } from "../SectionHeader";
import { Surface } from "../Surface";
import { staggerDelay, STAGGER_MAX, STAGGER_MS } from "../motion";

describe("PressableScale", () => {
  it("llama onPress y vibra con el tipo pedido", () => {
    const Haptics = jest.requireMock("expo-haptics") as { selectionAsync: jest.Mock };
    const onPress = jest.fn();
    render(
      <PressableScale haptics="selection" onPress={onPress} accessibilityLabel="Abrir">
        <Text>Abrir</Text>
      </PressableScale>,
    );
    fireEvent.press(screen.getByRole("button", { name: "Abrir" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });
});

describe("Surface", () => {
  it("es pulsable solo si recibe onPress", () => {
    const onPress = jest.fn();
    const { rerender } = render(
      <Surface>
        <Text>Tarjeta</Text>
      </Surface>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    rerender(
      <Surface onPress={onPress} accessibilityLabel="Tarjeta">
        <Text>Tarjeta</Text>
      </Surface>,
    );
    fireEvent.press(screen.getByRole("button", { name: "Tarjeta" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("ListGroup y ListRow", () => {
  it("muestra título y subtítulo, y anuncia ambos en filas pulsables", () => {
    const onPress = jest.fn();
    render(
      <ListGroup>
        <ListRow title="Hábitos" subtitle="2 de 5" onPress={onPress} />
        <ListRow title="Agua" />
      </ListGroup>,
    );
    expect(screen.getByText("Agua")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Hábitos. 2 de 5" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("SectionHeader", () => {
  it("muestra la acción solo cuando hay manejador", () => {
    const onAction = jest.fn();
    const { rerender } = render(<SectionHeader title="Tu día" actionLabel="Ver semana" />);
    expect(screen.queryByText("Ver semana")).toBeNull();
    rerender(<SectionHeader title="Tu día" actionLabel="Ver semana" onAction={onAction} />);
    fireEvent.press(screen.getByRole("button", { name: "Ver semana" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("header", { name: "Tu día" })).toBeTruthy();
  });
});

describe("MochiBubble", () => {
  it("anuncia la frase como dicha por Mochi", () => {
    render(<MochiBubble text="¿Cómo amaneciste?" />);
    expect(screen.getByLabelText("Mochi dice: ¿Cómo amaneciste?")).toBeTruthy();
  });
});

describe("ProgressRing", () => {
  it("expone el progreso redondeado y acotado", () => {
    render(<ProgressRing progress={1.4} accessibilityLabel="Hábitos de hoy" />);
    const ring = screen.getByRole("progressbar", { name: "Hábitos de hoy" });
    expect(ring.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 100 });
  });
});

describe("staggerDelay", () => {
  it("escalona hasta el máximo y luego se detiene", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2)).toBe(2 * STAGGER_MS);
    expect(staggerDelay(50)).toBe(STAGGER_MAX * STAGGER_MS);
  });
});

