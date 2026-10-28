import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { uriToBase64 } from "@/src/features/study/timer/helpers";
import type { StudyAttachment } from "@/src/features/study/timer/types";

export async function pickImageFromCamera(
  onSelect: (value: StudyAttachment) => void,
  onError: (message: string) => void,
) {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    onError("Permiso de cámara denegado");
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    base64: true,
  });

  if (result.canceled || result.assets.length === 0) return;

  const asset = result.assets[0];
  const mimeType = asset.mimeType || "image/jpeg";
  const base64 = asset.base64 || (await uriToBase64(asset.uri));

  onSelect({
    name: asset.fileName || "foto.jpg",
    mimeType,
    base64,
    previewUri: asset.uri,
  });
}

export async function pickImageFromGallery(
  onSelect: (value: StudyAttachment) => void,
  onError: (message: string) => void,
) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    onError("Permiso de galería denegado");
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || result.assets.length === 0) return;

  const asset = result.assets[0];
  const mimeType = asset.mimeType || "image/jpeg";
  const base64 = asset.base64 || (await uriToBase64(asset.uri));

  onSelect({
    name: asset.fileName || "imagen.jpg",
    mimeType,
    base64,
    previewUri: asset.uri,
  });
}

export async function pickDocument(onSelect: (value: StudyAttachment) => void) {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || result.assets.length === 0) return;

  const asset = result.assets[0];
  const mimeType = asset.mimeType || "application/pdf";
  const base64 = await uriToBase64(asset.uri);

  onSelect({
    name: asset.name,
    mimeType,
    base64,
    previewUri: mimeType.startsWith("image/") ? asset.uri : undefined,
  });
}
