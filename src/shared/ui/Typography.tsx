import type { ReactNode } from "react";
import { Text, type TextProps } from "react-native";

type TypoProps = Omit<TextProps, "children"> & { children: ReactNode; className?: string };

const SIZE = /^text-(xs|sm|base|lg|xl|[2-9]xl|\[[\d.]+px\])$/;
const LEADING = /^leading-/;
const isColor = (token: string) =>
  token.startsWith("text-") &&
  !SIZE.test(token) &&
  !/^text-(left|center|right|justify)$/.test(token);

/**
 * Une las clases base con las de `className`: si `className` trae su propio tamaño, interlineado
 * o color, se descarta el de la base (en NativeWind el orden del string no decide cuál gana).
 */
export function mergeTextClasses(base: string, extra: string): string {
  const extraTokens = extra.split(/\s+/).filter(Boolean);
  const has = (test: (t: string) => boolean) => extraTokens.some(test);
  const overrideSize = has((t) => SIZE.test(t));
  const overrideLeading = has((t) => LEADING.test(t));
  const overrideColor = has(isColor);
  const kept = base
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (t) =>
        !(overrideSize && SIZE.test(t)) &&
        !(overrideLeading && LEADING.test(t)) &&
        !(overrideColor && isColor(t)),
    );
  return [...kept, ...extraTokens].join(" ");
}

/**
 * Escala tipográfica de Mochi. Cada variante fija familia (una por peso), tamaño e interlineado;
 * `className` solo añade color, alineación o márgenes. No combinar con `font-bold` y similares:
 * en Android cambiarían a la fuente del sistema.
 */
function make(base: string, defaults: Partial<TextProps> = {}) {
  return function Typo({ className = "", children, ...rest }: TypoProps) {
    return (
      <Text {...defaults} {...rest} className={mergeTextClasses(base, className)}>
        {children}
      </Text>
    );
  };
}

/** Títulos de pantalla y saludos (Fredoka 30). */
export const Display = make("font-display text-[30px] leading-[34px] text-ink", {
  accessibilityRole: "header",
});
/** Títulos de sección y de tarjetas destacadas (Fredoka 20). */
export const Title = make("font-display text-xl leading-6 text-ink", {
  accessibilityRole: "header",
});
/** Texto principal (Nunito 15.5). */
export const Body = make("font-body text-[15.5px] leading-[21px] text-ink");
/** Texto principal resaltado: nombres de elementos de lista (Nunito ExtraBold). */
export const Strong = make("font-body-extrabold text-[15.5px] leading-[21px] text-ink");
/** Texto secundario (Nunito 13). */
export const Caption = make("font-body text-[13px] leading-[18px] text-ink-muted");
/** Antetítulo en versalitas: fecha, categoría (Nunito ExtraBold 12). */
export const Eyebrow = make(
  "font-body-extrabold text-xs uppercase tracking-[0.9px] text-ink-muted",
);
/** La voz de Mochi: serif cursiva, como una nota escrita a mano. */
export const MochiQuote = make("font-quote text-[19px] leading-[25px] text-ink");
