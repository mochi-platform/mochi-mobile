const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");

const HUES =
  "red|orange|amber|yellow|green|emerald|teal|sky|blue|indigo|violet|fuchsia|rose|slate|gray|purple|pink";
const MIGRATED = [
  "src/shared/ui/**/*.{ts,tsx}",
  "src/shared/mochi/**/*.{ts,tsx}",
  "src/features/companion/**/*.{ts,tsx}",
  "src/features/today/**/*.{ts,tsx}",
  "src/features/navigation/**/*.{ts,tsx}",
  "app/mochi-gallery.tsx",
  "app/(tabs)/me.tsx",
  "app/(tabs)/duo.tsx",
  "src/features/duo/DuoScreen.tsx",
  "src/features/duo/api.ts",
  "src/features/duo/partnerTips.ts",
  "src/features/onboarding/OnboardingScreen.tsx",
  "app/onboarding.tsx",
  "src/features/me/**/*.{ts,tsx}",
  "src/features/study/api.ts",
  "app/(tabs)/study.tsx",
  "app/(tabs)/cooking.tsx",
  "app/(tabs)/habits.tsx",
  "app/(tabs)/mood.tsx",
  "app/profile.tsx",
  "app/(tabs)/goals.tsx",
  "app/(tabs)/exercise.tsx",
  "app/login.tsx",
  "app/vouchers.tsx",
  "app/mochi-duo-invite.tsx",
  "app/study-timer.tsx",
  "app/recipe-detail.tsx",
  "app/recipe-player.tsx",
  "app/routine-player.tsx",
  "app/settings.tsx",
  "src/features/settings/components/**/*.tsx",
  "src/features/study/timer/components/StudySetupView.tsx",
  "src/features/study/timer/components/StudyTimerView.tsx",
  "src/features/study/timer/components/StudyCompleteView.tsx",
  "src/features/exercise/api.ts",
  "src/features/goals/**/*.{ts,tsx}",
  "app/(tabs)/gratitude.tsx",
  "src/features/mood/**/*.{ts,tsx}",
  "src/features/gratitude/**/*.{ts,tsx}",
  "src/features/habits/**/*.{ts,tsx}",
  "src/features/cooking/components/RecipeCard.tsx",
  "src/features/cooking/components/OwnRecipesList.tsx",
  "src/features/cooking/components/RecipeFiltersCard.tsx",
  "src/features/cooking/components/PublicRecipeCard.tsx",
  "src/features/cooking/components/PublicRecipesCatalog.tsx",
  "src/features/today/**/*.{ts,tsx}",
  "src/features/companion/**/*.{ts,tsx}",
  "app/(tabs)/wellness.tsx",
];

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
  {
    files: ["jest.setup.js"],
    languageOptions: { globals: { jest: "readonly" } },
  },
  {
    // Archivos ya migrados al Remaster: solo tokens y componentes de src/shared/ui.
    // Añade aquí cada carpeta o archivo al terminar de migrarlo (ver docs/DESIGN.md).
    files: MIGRATED,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-native",
              importNames: ["TouchableOpacity"],
              message: "Usa PressableScale de src/shared/ui (escala + vibración).",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/\\b(bg|text|border)-(${HUES})-\\d{2,3}\\b/]`,
          message: "Usa tokens (bg-surface, text-ink, bg-tint-*), no colores sueltos.",
        },
        {
          selector: `TemplateElement[value.raw=/\\b(bg|text|border)-(${HUES})-\\d{2,3}\\b/]`,
          message: "Usa tokens (bg-surface, text-ink, bg-tint-*), no colores sueltos.",
        },
        {
          selector: "CallExpression[callee.name='tc']",
          message: "tc() es del modo oscuro anterior; usa COLORS de src/shared/theme/tokens.",
        },
      ],
    },
  },
]);
