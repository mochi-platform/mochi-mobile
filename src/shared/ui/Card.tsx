import type { ReactNode } from "react";
import { View } from "react-native";

type CardProps = { children: ReactNode; className?: string };

export function Card({ children, className = "" }: CardProps) {
  return (
    <View className={`rounded-card border border-line bg-surface p-4 ${className}`}>
      {children}
    </View>
  );
}
