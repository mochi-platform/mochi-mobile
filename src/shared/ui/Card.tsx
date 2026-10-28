import type { ReactNode } from "react";
import { Surface } from "./Surface";

type CardProps = { children: ReactNode; className?: string };

/** Tarjeta con relleno estándar. Equivale a <Surface className="p-4">: sin borde, con sombra. */
export function Card({ children, className = "" }: CardProps) {
  return <Surface className={`p-4 ${className}`}>{children}</Surface>;
}
