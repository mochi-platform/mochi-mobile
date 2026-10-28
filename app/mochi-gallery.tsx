import { useRef, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { MochiCanvas, type MochiHandle } from "@/src/shared/mochi/MochiCanvas";
import { EXPRESSION_BASE_MOOD, type MochiExpression } from "@/src/shared/mochi/manifest";
import type { MochiReaction } from "@/src/shared/mochi/useMochiRig";
import { Button, Caption, Chip, MochiBubble, Screen, Strong, Surface } from "@/src/shared/ui";

const LABELS: Record<MochiExpression, string> = {
  happy: "Feliz",
  excited: "Emocionada",
  thinking: "Pensando",
  sleepy: "Con sueño",
  proud: "Orgullosa",
  worried: "Preocupada",
  celebrating: "Celebrando",
  tired: "Cansada",
  focused: "Concentrada",
  soft_sad: "Triste",
  love: "Enamorada",
};

const REACTIONS: { kind: MochiReaction; label: string }[] = [
  { kind: "tap", label: "Toque" },
  { kind: "jump", label: "Salto" },
  { kind: "celebrate", label: "Celebrar" },
  { kind: "nod", label: "Asentir" },
  { kind: "shy", label: "Tímida" },
];

const EXPRESSIONS = Object.keys(EXPRESSION_BASE_MOOD) as MochiExpression[];

/** Galería para revisar el arte de Mochi en el teléfono (mochi://mochi-gallery). */
export default function MochiGalleryScreen() {
  const [expression, setExpression] = useState<MochiExpression>("happy");
  const hero = useRef<MochiHandle>(null);

  return (
    <Screen title="Mochi" eyebrow="Galería de expresiones" withTabBar={false}>
      <View className="mt-4 items-center">
        <MochiCanvas ref={hero} expression={expression} size={190} interactive />
      </View>
      <MochiBubble
        className="mt-4"
        text={`${LABELS[expression]}. Tócame o prueba una reacción.`}
      >
        <View className="mt-3 flex-row flex-wrap gap-2">
          {REACTIONS.map((r) => (
            <Chip key={r.kind} label={r.label} onPress={() => hero.current?.react(r.kind)} />
          ))}
        </View>
      </MochiBubble>

      <View className="mt-6 flex-row flex-wrap justify-between gap-y-3">
        {EXPRESSIONS.map((name) => (
          <Surface
            key={name}
            onPress={() => setExpression(name)}
            accessibilityLabel={LABELS[name]}
            className={`w-[48%] items-center px-2 pb-3 pt-4 ${name === expression ? "bg-accent-soft" : ""}`}
          >
            <MochiCanvas expression={name} size={96} animated={false} shadow={false} />
            <Strong className="mt-2">{LABELS[name]}</Strong>
            <Caption>{name}</Caption>
          </Surface>
        ))}
      </View>
      <View className="mt-6">
        <Button title="Volver" variant="soft" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
