export const colorMap: Record<string, string> = {
  pink: "bg-tint-me",
  blue: "bg-surface-muted",
  yellow: "bg-tint-kitchen",
  teal: "bg-tint-ok",
  purple: "bg-tint-study",
  green: "bg-tint-ok",
};

export const colorBorderMap: Record<string, string> = {
  pink: "",
  blue: "",
  yellow: "",
  teal: "",
  purple: "",
  green: "",
};

export const POMODORO_FOCUS_SECONDS = 25 * 60;
export const POMODORO_BREAK_SECONDS = 5 * 60;

export function parseTimeToSeconds(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours * 60 + minutes) * 60;
}

export function calcDurationSeconds(startTime: string, endTime: string): number {
  return parseTimeToSeconds(endTime) - parseTimeToSeconds(startTime);
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDurationMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60));
}

export function summarizeSession(topic: string): string {
  const clean = topic.trim();
  if (!clean) {
    return "Consolidaste una sesión de enfoque con objetivos claros.\nTu constancia de hoy fortalece tu progreso.";
  }

  return `Estudiaste: ${clean.slice(0, 90)}${clean.length > 90 ? "..." : ""}.\nOrdenaste ideas clave y diste un paso firme en tu avance.`;
}

export function getAttachmentLabel(mimeType: string): string {
  return mimeType === "application/pdf" ? "PDF adjunto" : "Imagen adjunta";
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : "";
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

export async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blobToBase64(blob);
}
