import { useEffect, useState, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ELEVATION } from "./elevation";
import { DURATION, EASE_OUT, REDUCE } from "./motion";
import { Title } from "./Typography";

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/**
 * Hoja inferior: sube desde abajo y se cierra tocando el fondo o con el botón atrás.
 * El Modal sigue abierto hasta que termina la animación de salida (si no, desaparecería de golpe).
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  const exiting = SlideOutDown.duration(DURATION.base)
    .reduceMotion(REDUCE)
    .withCallback((finished) => {
      "worklet";
      if (finished) runOnJS(setMounted)(false);
    });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {visible ? (
          <Animated.View
            entering={FadeIn.duration(DURATION.base).reduceMotion(REDUCE)}
            exiting={FadeOut.duration(DURATION.base).reduceMotion(REDUCE)}
            className="absolute inset-0 bg-ink/30"
          >
            <Pressable
              className="flex-1"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            />
          </Animated.View>
        ) : null}
        {visible ? (
          <Animated.View
            entering={SlideInDown.duration(DURATION.slow).easing(EASE_OUT).reduceMotion(REDUCE)}
            exiting={exiting}
            className="rounded-t-[30px] bg-canvas px-5 pt-3"
            style={[ELEVATION[3], { paddingBottom: insets.bottom + 20 }]}
            accessibilityViewIsModal
          >
            <View className="mb-3 h-1.5 w-10 self-center rounded-full bg-ink-faint/50" />
            {title ? <Title className="mb-3">{title}</Title> : null}
            {/* Contenido alto (formularios) se desplaza dentro de la hoja en vez de salirse. */}
            <ScrollView
              style={{ maxHeight: height * 0.72 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}
