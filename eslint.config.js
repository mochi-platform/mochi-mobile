const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expo,
  {
    ignores: ["config/*", "dist/*", "android/*", "ios/*", ".expo/*", "supabase/functions/*", "scripts/*", "supabase/.temp/*"],
  },
  {
    // En React Native las comillas en <Text> no necesitan escape.
    rules: { "react/no-unescaped-entities": "off" },
  },
  {
    // Prohibido tragarse errores: usar reportError().
    rules: { "no-empty": ["error", { allowEmptyCatch: false }] },
  },
  {
    // Reglas del compilador de React (no usamos React Compiler): generan falsos positivos
    // en patrones de carga de datos con useEffect.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
]);
