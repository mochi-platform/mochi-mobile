import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import { Modal, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Caption, Title } from "@/src/shared/ui";

type Props = { visible: boolean; onClose: () => void; onCode: (code: string) => void };

/** Escanea el QR de invitación de la pareja. Solo se usa la cámara mientras esta ventana está abierta. */
export function QrScannerModal({ visible, onClose, onCode }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <Modal statusBarTranslucent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-canvas px-5" style={{ paddingTop: insets.top }}>
        <Title className="mt-8">Escanea el código de tu pareja</Title>
        {permission?.granted ? (
          <View className="mt-4 flex-1 overflow-hidden rounded-card">
            <CameraView
              style={{ flex: 1 }}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data }) => {
                if (handled) return;
                setHandled(true);
                onCode(data.trim().toUpperCase());
                onClose();
                setTimeout(() => setHandled(false), 1000);
              }}
            />
          </View>
        ) : (
          <View className="mt-6">
            <Caption className="mb-3">
              Necesitamos la cámara solo para leer el QR. No se guarda ninguna imagen.
            </Caption>
            <Button title="Permitir cámara" onPress={() => void requestPermission()} />
          </View>
        )}
        <View className="mt-4" style={{ marginBottom: insets.bottom + 12 }}>
          <Button title="Cerrar" variant="outline" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export default QrScannerModal;
