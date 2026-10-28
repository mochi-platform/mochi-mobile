/* Simulaciones comunes para los tests de componentes. */

// Los iconos cargan una fuente como asset, que no existe en Jest: se dibujan como un Text con su nombre.
jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  const make = () => {
    const Icon = ({ name }) => require("react").createElement(Text, null, name);
    Icon.glyphMap = new Proxy({}, { get: () => 0 });
    return Icon;
  };
  return new Proxy({ __esModule: true }, { get: (target, key) => (key in target ? target[key] : make()) });
});

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

// Skia necesita su módulo nativo: en Jest cada primitiva es una View que conserva sus props.
jest.mock("@shopify/react-native-skia", () => {
  const mockReact = require("react");
  const { View } = require("react-native");
  const component = (name) => {
    const C = ({ children, ...props }) =>
      mockReact.createElement(View, { testID: `skia-${name}`, ...props }, children);
    C.displayName = name;
    return C;
  };
  return new Proxy(
    { vec: (x, y) => ({ x, y }), __esModule: true },
    { get: (target, key) => (key in target ? target[key] : component(String(key))) },
  );
});

// AsyncStorage en memoria (lo usa el cliente de Supabase al importarse).
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
