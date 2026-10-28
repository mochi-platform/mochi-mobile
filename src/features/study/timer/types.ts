export type StudyPhase = "setup" | "studying" | "complete";
export type TimerMode = "regular" | "pomodoro";
export type PomodoroPhase = "focus" | "break";

export type StudyMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StudyAttachment = {
  name: string;
  mimeType: string;
  base64: string;
  previewUri?: string;
};
