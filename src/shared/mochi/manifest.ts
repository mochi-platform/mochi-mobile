/**
 * Manifiesto tipado del arte de Mochi.
 * Hoy hay 4 expresiones base; las demás reutilizan la más cercana hasta que
 * exista su arte final (ver assets/mochi/README.md para añadirlas).
 */
export type MochiExpression =
  | "happy"
  | "thinking"
  | "sleepy"
  | "excited"
  | "proud"
  | "worried"
  | "celebrating"
  | "tired"
  | "focused"
  | "soft_sad";

export type MochiOutfit = "none";

/** Las 4 animaciones base que implementa MochiCharacter. */
export type MochiBaseMood = "happy" | "thinking" | "sleepy" | "excited";

export const EXPRESSION_BASE_MOOD: Record<MochiExpression, MochiBaseMood> = {
  happy: "happy",
  thinking: "thinking",
  sleepy: "sleepy",
  excited: "excited",
  proud: "happy",
  worried: "thinking",
  celebrating: "excited",
  tired: "sleepy",
  focused: "thinking",
  soft_sad: "sleepy",
};

type Source = number;

const BASE_SOURCES: Record<MochiBaseMood, Source> = {
  happy: require("../../../assets/mochi-expressions/happy.png"),
  thinking: require("../../../assets/mochi-expressions/thinking.png"),
  sleepy: require("../../../assets/mochi-expressions/sleepy.png"),
  excited: require("../../../assets/mochi-expressions/excited.png"),
};

/** Arte específico por expresión (cuando exista). Si falta, se usa el de su estado base. */
const EXPRESSION_SOURCES: Partial<Record<MochiExpression, Source>> = {};

/** Atuendos (Premium): arte por expresión. Vacío hasta la primera tanda. */
const OUTFIT_SOURCES: Record<MochiOutfit, Partial<Record<MochiExpression, Source>>> = {
  none: {},
};

export function resolveMochiSource(
  expression: MochiExpression,
  outfit: MochiOutfit = "none",
): Source {
  return (
    OUTFIT_SOURCES[outfit][expression] ??
    EXPRESSION_SOURCES[expression] ??
    BASE_SOURCES[EXPRESSION_BASE_MOOD[expression]]
  );
}
