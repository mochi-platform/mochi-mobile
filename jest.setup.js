/* Simulaciones comunes para los tests de componentes. */

// Los iconos cargan una fuente como asset, que no existe en Jest: se dibujan como un Text con su nombre.
jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  const make = () => {
    const Icon = ({ name }) => require("react").createElement(Text, null, name);
    Icon.glyphMap = new Proxy({}, { get: () => 0 });
    return Icon;
  };
  return { Ionicons: make(), MaterialCommunityIcons: make() };
});

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));
