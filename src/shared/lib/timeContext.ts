export type TimeOfDay = "dawn" | "morning" | "afternoon" | "evening" | "night";

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 19) return "afternoon";
  if (hour >= 19 && hour < 21) return "evening";
  return "night";
}

export function getGreeting(name: string): string {
  const timeOfDay = getTimeOfDay();

  if (timeOfDay === "dawn") return `Madrugas mucho, ${name}`;
  if (timeOfDay === "morning") return `Buenos días, ${name}`;
  if (timeOfDay === "afternoon") return `Buenas tardes, ${name}`;
  if (timeOfDay === "evening") return `Buenas noches, ${name}`;
  return `Descansa pronto, ${name}`;
}

export function getTimeIcon(): string {
  const timeOfDay = getTimeOfDay();

  if (timeOfDay === "dawn") return "partly-sunny";
  if (timeOfDay === "morning") return "sunny";
  if (timeOfDay === "afternoon") return "sunny";
  if (timeOfDay === "evening") return "moon";
  return "moon";
}

export function getTimeColor(): string {
  const timeOfDay = getTimeOfDay();

  if (timeOfDay === "dawn") return "bg-indigo-100";
  if (timeOfDay === "morning") return "bg-yellow-100";
  if (timeOfDay === "afternoon") return "bg-blue-100";
  if (timeOfDay === "evening") return "bg-purple-100";
  return "bg-indigo-200";
}
