import type { ReactNode } from "react";
import { View } from "react-native";
import { ELEVATION } from "./elevation";
import { MochiQuote } from "./Typography";

type Tail = "up" | "left" | "none";

type MochiBubbleProps = {
  /** Lo que dice Mochi (va en la voz serif cursiva). */
  text: string;
  /** Hacia dónde apunta el pico: arriba si Mochi está encima, izquierda si está al lado. */
  tail?: Tail;
  /** Contenido bajo la frase: caritas del check-in, un campo, botones. */
  children?: ReactNode;
  className?: string;
  size?: "md" | "lg";
};

/** Globo de diálogo de Mochi. Se anuncia como texto de Mochi para lectores de pantalla. */
export function MochiBubble({
  text,
  tail = "up",
  children,
  className = "",
  size = "md",
}: MochiBubbleProps) {
  return (
    <View className={`relative ${className}`}>
      {tail !== "none" ? (
        <View
          className="absolute h-[18px] w-[18px] rounded-[4px] bg-surface"
          style={[
            { transform: [{ rotate: "45deg" }] },
            tail === "up" ? { top: -7, left: "50%", marginLeft: -9 } : { left: -6, top: 24 },
          ]}
        />
      ) : null}
      <View className="rounded-[24px] bg-surface px-[18px] py-4" style={ELEVATION[2]}>
        <MochiQuote
          accessibilityLabel={`Mochi dice: ${text}`}
          className={size === "lg" ? "text-[21px] leading-[28px]" : ""}
        >
          {text}
        </MochiQuote>
        {children}
      </View>
    </View>
  );
}
