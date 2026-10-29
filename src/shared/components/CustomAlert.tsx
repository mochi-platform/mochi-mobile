import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, View } from "react-native";
import { Body, Button, ELEVATION, Title } from "@/src/shared/ui";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export type CustomAlertButtonStyle = "default" | "cancel" | "destructive";

export type CustomAlertButton = {
  text: string;
  onPress?: () => void;
  style?: CustomAlertButtonStyle;
};

export type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  buttons: CustomAlertButton[];
};

type ShowAlertParams = {
  title: string;
  message: string;
  buttons: CustomAlertButton[];
};

const BUTTON_VARIANT: Record<CustomAlertButtonStyle, "primary" | "outline" | "danger"> = {
  default: "primary",
  cancel: "outline",
  destructive: "danger",
};

/** Diálogo propio de la app: tarjeta crema con la tipografía y los botones del sistema. */
export function CustomAlert({ visible, title, message, buttons }: CustomAlertProps) {
  const scale = useSharedValue(0.92);
  const isDualAction = buttons.length === 2;

  useEffect(() => {
    if (visible) {
      scale.value = 0.92;
      scale.value = withSpring(1, { damping: 16, stiffness: 220, mass: 0.8 });
      return;
    }
    scale.value = withTiming(0.92, { duration: 120 });
  }, [visible, scale]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Modal statusBarTranslucent visible={visible} transparent animationType="fade" onRequestClose={() => undefined}>
      <View className="flex-1 items-center justify-center bg-ink/30 px-6">
        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[ELEVATION[3], cardAnimatedStyle]}
          className="w-full max-w-sm rounded-[28px] bg-canvas p-6"
        >
          <Title className="text-center text-[22px] leading-[27px]">{title}</Title>
          <Body className="mt-2 text-center text-ink-muted">{message}</Body>
          <View className={`mt-6 gap-2 ${isDualAction ? "flex-row" : ""}`}>
            {buttons.map((button, index) => (
              <View key={`${button.text}-${index}`} className={isDualAction ? "flex-1" : ""}>
                <Button
                  title={button.text}
                  variant={BUTTON_VARIANT[button.style ?? "default"]}
                  onPress={() => button.onPress?.()}
                />
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function useCustomAlert() {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [buttons, setButtons] = useState<CustomAlertButton[]>([]);

  const closeAlert = useCallback(() => {
    setVisible(false);
  }, []);

  const showAlert = useCallback(
    ({ title: nextTitle, message: nextMessage, buttons: nextButtons }: ShowAlertParams) => {
      const buttonsWithClose = (
        nextButtons.length > 0 ? nextButtons : [{ text: "Aceptar", style: "default" as const }]
      ).map((button) => ({
        ...button,
        onPress: () => {
          closeAlert();
          button.onPress?.();
        },
      }));

      setTitle(nextTitle);
      setMessage(nextMessage);
      setButtons(buttonsWithClose);
      setVisible(true);
    },
    [closeAlert],
  );

  const alertElement = useMemo(
    () => <CustomAlert visible={visible} title={title} message={message} buttons={buttons} />,
    [visible, title, message, buttons],
  );

  return {
    showAlert,
    AlertComponent: alertElement,
  };
}
