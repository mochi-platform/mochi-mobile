/** Extrae y parsea el primer objeto o arreglo JSON de una respuesta de modelo (con o sin ``` ). */
export function parseModelJson(raw: string, expected: "object" | "array"): unknown {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const open = expected === "array" ? "[" : "{";
  const close = expected === "array" ? "]" : "}";
  const start = cleaned.indexOf(open);
  const end = cleaned.lastIndexOf(close);
  if (start === -1 || end <= start) throw new Error("no_json");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export function isLikelyTruncated(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  const opens = (t.match(/[{[]/g) ?? []).length;
  const closes = (t.match(/[}\]]/g) ?? []).length;
  return opens > closes;
}
