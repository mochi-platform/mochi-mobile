export const colorMap: Record<string, string> = {
  pink: "bg-pink-100 dark:bg-pink-900",
  blue: "bg-blue-100 dark:bg-blue-900",
  yellow: "bg-yellow-100 dark:bg-yellow-900",
  teal: "bg-teal-100 dark:bg-teal-900",
  purple: "bg-purple-100 dark:bg-purple-900",
  green: "bg-green-100 dark:bg-green-900",
};

export const colorBorderMap: Record<string, string> = {
  pink: "border-pink-300 dark:border-pink-700",
  blue: "border-blue-300 dark:border-blue-700",
  yellow: "border-yellow-300 dark:border-yellow-700",
  teal: "border-teal-300 dark:border-teal-700",
  purple: "border-purple-300 dark:border-purple-700",
  green: "border-green-300 dark:border-green-700",
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
