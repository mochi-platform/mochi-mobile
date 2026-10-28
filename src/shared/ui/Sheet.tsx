import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ELEVATION } from "./elevation";
import { EASE_OUT, DURATION, REDUCE } from "./motion";
import { Title } from "./Typography";

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** Hoja inferior: sube desde abajo, se cierra tocando el fondo o con el botón atrás. */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {visible ? (
        <View className="flex-1 justify-end">
          <Animated.View
            entering={FadeIn.duration(DURATION.base).reduceMotion(REDUCE)}
            exiting={FadeOut.duration(DURATION.fast).reduceMotion(REDUCE)}
            className="absolute inset-0 bg-ink/30"
          >
            <Pressable
              className="flex-1"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.duration(DURATION.slow).easing(EASE_OUT).reduceMotion(REDUCE)}
            exiting={SlideOutDown.duration(DURATION.base).reduceMotion(REDUCE)}
            className="rounded-t-[30px] bg-canvas px-5 pt-3"
            style={[ELEVATION[3], { paddingBottom: insets.bottom + 20 }]}
            accessibilityViewIsModal
          >
            <View className="mb-3 h-1.5 w-10 self-center rounded-full bg-ink-faint/50" />
            {title ? <Title className="mb-3">{title}</Title> : null}
            {children}
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}
