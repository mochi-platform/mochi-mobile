import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
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

function getButtonStyles(style: CustomAlertButtonStyle | undefined) {
  if (style === "cancel") {
    return {
      buttonStyle: {
        backgroundColor: "#ffffff",
        borderWidth: 2,
        borderColor: "#e9d5ff",
      },
      textStyle: {
        color: "#7e22ce",
      },
    };
  }

  if (style === "destructive") {
    return {
      buttonStyle: {
        backgroundColor: "#dc2626",
        borderWidth: 2,
        borderColor: "#b91c1c",
      },
      textStyle: {
        color: "#ffffff",
      },
    };
  }

  return {
    buttonStyle: {
      backgroundColor: "#a855f7",
    },
    textStyle: {
      color: "#ffffff",
    },
  };
}

export function CustomAlert({
  visible,
  title,
  message,
  buttons,
}: CustomAlertProps) {
  const scale = useSharedValue(0.85);
  const isDualAction = buttons.length === 2;

  useEffect(() => {
    if (visible) {
      scale.value = 0.85;
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 190,
        mass: 0.8,
      });
      return;
    }

    scale.value = withTiming(0.85, { duration: 120 });
  }, [visible, scale]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => undefined}
    >
      <View className="flex-1 items-center justify-center bg-black/30 px-6">
        <Animated.View
          style={cardAnimatedStyle}
          className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        >
          <Text className="text-center text-2xl font-extrabold text-purple-700">
            {title}
          </Text>
          <Text className="mt-3 text-center text-base font-semibold leading-6 text-slate-600">
            {message}
          </Text>

          <View className={`mt-6 ${isDualAction ? "flex-row" : ""}`}>
            {buttons.map((button, index) => {
              const { buttonStyle, textStyle } = getButtonStyles(button.style);

              return (
                <TouchableOpacity
                  key={`${button.text}-${index}`}
                  className={`rounded-2xl px-4 py-3 ${isDualAction ? `flex-1 ${index === 0 ? "mr-2" : "ml-2"}` : index > 0 ? "mt-3" : ""}`}
                  style={buttonStyle}
                  onPress={button.onPress}
                  activeOpacity={0.85}
                >
                  <Text className="text-center text-base font-extrabold" style={textStyle}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
    ({
      title: nextTitle,
      message: nextMessage,
      buttons: nextButtons,
    }: ShowAlertParams) => {
      const buttonsWithClose = (
        nextButtons.length > 0
          ? nextButtons
          : [{ text: "Aceptar", style: "default" as const }]
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
    () => (
      <CustomAlert
        visible={visible}
        title={title}
        message={message}
        buttons={buttons}
      />
    ),
    [visible, title, message, buttons],
  );

  return {
    showAlert,
    AlertComponent: alertElement,
  };
}
