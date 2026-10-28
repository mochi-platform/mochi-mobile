import { useState } from "react";
import { Modal, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "@/src/shared/ui";

type Props = { visible: boolean; onClose: () => void; onCode: (code: string) => void };

/** Escanea el QR de invitación de la pareja. Solo se usa la cámara mientras esta ventana está abierta. */
export function QrScannerModal({ visible, onClose, onCode }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [handled, setHandled] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-canvas p-5">
        <Text className="mt-8 text-xl font-extrabold text-ink">Escanea el código de tu pareja</Text>
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
            <Text className="mb-3 text-sm font-semibold text-ink-muted">
              Necesitamos la cámara solo para leer el QR. No se guarda ninguna imagen.
            </Text>
            <Button title="Permitir cámara" onPress={() => void requestPermission()} />
          </View>
        )}
        <View className="mb-6 mt-4">
          <Button title="Cerrar" variant="outline" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export default QrScannerModal;
