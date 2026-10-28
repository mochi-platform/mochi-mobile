import { useCallback, useEffect, useRef } from "react";
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

/** Reacciones que cualquier pantalla puede pedirle a Mochi. */
export type MochiReaction = "tap" | "celebrate" | "nod" | "jump" | "shy" | "pop";

const BREATH_MS = 1600; // medio ciclo: respira cada 3,2 s
const SETTLE = { damping: 9, stiffness: 260, mass: 0.8 } as const;
const DEG = Math.PI / 180;

/** Siguiente parpadeo entre 2 y 6 s; a veces doble. */
function nextBlinkDelay(): number {
  return 2000 + Math.random() * 4000;
}

/**
 * Estado animado de Mochi, todo en el hilo de UI: respiración, parpadeo, mirada,
 * aplastamiento, salto e inclinación. Con "reducir movimiento" solo parpadea.
 */
export function useMochiRig(animated: boolean) {
  const reduceMotion = useReducedMotion();
  const live = animated && !reduceMotion;

  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);
  const jump = useSharedValue(0);
  const tilt = useSharedValue(0);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);

  useEffect(() => {
    if (!live) {
      cancelAnimation(breath);
      breath.set(0);
      return;
    }
    breath.set(
      withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(breath);
  }, [live, breath]);

  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!animated) return;
    const schedule = () => {
      blinkTimer.current = setTimeout(() => {
        const close = withTiming(0.08, { duration: 70 });
        const open = withTiming(1, { duration: 120 });
        blink.set(
          Math.random() < 0.2
            ? withSequence(close, open, withDelay(90, close), open)
            : withSequence(close, open),
        );
        schedule();
      }, nextBlinkDelay());
    };
    schedule();
    return () => {
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    };
  }, [animated, blink]);

  const react = useCallback(
    (kind: MochiReaction) => {
      // Sin movimiento: solo un parpadeo como acuse.
      if (!live) {
        blink.set(withSequence(withTiming(0.08, { duration: 70 }), withTiming(1, { duration: 120 })));
        return;
      }
      switch (kind) {
        case "tap":
        case "pop":
          squashX.set(withSequence(withTiming(kind === "tap" ? 1.12 : 1.06, { duration: 90 }), withSpring(1, SETTLE)));
          squashY.set(withSequence(withTiming(kind === "tap" ? 0.86 : 0.93, { duration: 90 }), withSpring(1, SETTLE)));
          break;
        case "jump":
        case "celebrate": {
          const height = kind === "celebrate" ? -16 : -10;
          squashY.set(
            withSequence(
              withTiming(0.88, { duration: 90 }),
              withTiming(1.08, { duration: 120 }),
              withDelay(160, withTiming(0.9, { duration: 80 })),
              withSpring(1, SETTLE),
            ),
          );
          squashX.set(
            withSequence(
              withTiming(1.1, { duration: 90 }),
              withTiming(0.95, { duration: 120 }),
              withDelay(160, withTiming(1.08, { duration: 80 })),
              withSpring(1, SETTLE),
            ),
          );
          jump.set(
            withSequence(
              withDelay(90, withTiming(height, { duration: 200, easing: Easing.out(Easing.quad) })),
              withTiming(0, { duration: 170, easing: Easing.in(Easing.quad) }),
            ),
          );
          if (kind === "celebrate") {
            tilt.set(
              withSequence(
                withDelay(300, withTiming(-6, { duration: 110 })),
                withTiming(6, { duration: 140 }),
                withSpring(0, SETTLE),
              ),
            );
          }
          break;
        }
        case "nod":
          squashY.set(
            withSequence(
              withTiming(0.94, { duration: 120 }),
              withTiming(1, { duration: 120 }),
              withTiming(0.94, { duration: 120 }),
              withSpring(1, SETTLE),
            ),
          );
          break;
        case "shy":
          tilt.set(withSequence(withTiming(-7, { duration: 180 }), withDelay(700, withSpring(0, SETTLE))));
          lookY.set(withSequence(withTiming(1.5, { duration: 180 }), withDelay(700, withTiming(0, { duration: 200 }))));
          lookX.set(withSequence(withTiming(-1.5, { duration: 180 }), withDelay(700, withTiming(0, { duration: 200 }))));
          break;
      }
    },
    [live, blink, squashX, squashY, jump, tilt, lookX, lookY],
  );

  /** Cuerpo: respira y se aplasta desde la base; salta e inclina. */
  const bodyTransform = useDerivedValue(() => {
    const b = breath.get();
    return [
      { translateY: jump.get() },
      { rotate: tilt.get() * DEG },
      { scaleX: squashX.get() * (1 - 0.012 * b) },
      { scaleY: squashY.get() * (1 + 0.025 * b) },
    ];
  });

  /** Ojos: parpadean desde su línea central y siguen la mirada. */
  const eyesTransform = useDerivedValue(() => [
    { translateX: lookX.get() },
    { translateY: lookY.get() },
    { scaleY: blink.get() },
  ]);

  const pupilsTransform = useDerivedValue(() => [
    { translateX: lookX.get() * 0.6 },
    { translateY: lookY.get() * 0.6 },
  ]);

  /** Mirar hacia un punto relativo (-1 a 1 en cada eje). */
  const lookAt = useCallback(
    (x: number, y: number) => {
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      lookX.set(withTiming(clamp(x) * 2.2, { duration: 220 }));
      lookY.set(withTiming(clamp(y) * 1.6, { duration: 220 }));
    },
    [lookX, lookY],
  );

  return { bodyTransform, eyesTransform, pupilsTransform, blink, react, lookAt };
}
