import { useCallback, useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Card, Chip, Toggle } from "@/src/shared/ui";
import { getConsent, setConsent } from "@/src/shared/lib/consents";
import { supabase } from "@/src/shared/lib/supabase";
import { syncAnalyticsConsent } from "@/src/shared/lib/observability/analytics";

type MemoryRow = { kind: string; content: string };
const TONES = ["cálido", "directo", "tranquilo"] as const;

export function MochiMemoryCard() {
  const [enabled, setEnabled] = useState(false);
  const [rows, setRows] = useState<MemoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const granted = await getConsent("mochi_memory");
    setEnabled(granted);
    if (!granted) {
      setRows([]);
      return;
    }
    await supabase.rpc("refresh_mochi_memory");
    const { data } = await supabase
      .from("mochi_memory")
      .select("kind, content")
      .returns<MemoryRow[]>();
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (value: boolean) => {
    setError(null);
    try {
      await setConsent("mochi_memory", value);
      await load();
    } catch {
      setError("No se pudo guardar el cambio. Intenta de nuevo.");
    }
  };

  const chooseTone = async (tone: string) => {
    setError(null);
    const { error: toneError } = await supabase.rpc("set_mochi_tone", { p_tone: tone });
    if (toneError) setError("No se pudo guardar el tono.");
    await load();
  };

  const forget = async () => {
    setError(null);
    const { error: deleteError } = await supabase.from("mochi_memory").delete().neq("kind", "");
    if (deleteError) setError("No se pudo borrar la memoria.");
    await load();
  };

  return (
    <Card className="mt-6">
      <Text className="text-lg font-extrabold text-ink">Lo que Mochi recuerda</Text>
      <Text className="mt-2 text-sm font-semibold text-ink-muted">
        Si lo activas, Mochi guarda un resumen corto de tus metas activas, tus próximos exámenes, tu
        racha y el tono que prefieres, y lo envía a la IA (OpenRouter y sus modelos de terceros, que
        pueden registrar el texto) en cada consulta para personalizar sus respuestas. Los títulos de
        tus metas y materias salen de la app: no escribas en ellos datos personales ni de salud.
        Nunca incluye tu ciclo.
      </Text>
      <Toggle
        label="Activar memoria de Mochi"
        value={enabled}
        onValueChange={(value) => void toggle(value)}
      />

      {enabled ? (
        <>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {TONES.map((tone) => (
              <Chip key={tone} label={`Tono ${tone}`} onPress={() => void chooseTone(tone)} />
            ))}
          </View>

          <View className="mt-3 rounded-control bg-surface-muted p-3">
            {rows.length === 0 ? (
              <Text className="text-xs font-semibold text-ink-muted">
                Todavía no hay nada que recordar. Crea metas o exámenes y aparecerán aquí.
              </Text>
            ) : (
              rows.map((row) => (
                <Text key={row.kind} className="mb-1 text-xs font-semibold text-ink">
                  {row.content}
                </Text>
              ))
            )}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            className="mt-3 min-h-[44px] items-center justify-center"
            onPress={() => void forget()}
          >
            <Text className="font-extrabold text-danger">Olvidar todo</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {error ? <Text className="mt-2 text-xs font-semibold text-danger">{error}</Text> : null}
    </Card>
  );
}

export function AnalyticsConsentCard() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    void getConsent("analytics").then(setEnabled);
  }, []);

  const toggle = async (value: boolean) => {
    setEnabled(value);
    try {
      await setConsent("analytics", value);
      const { data } = await supabase.auth.getUser();
      await syncAnalyticsConsent(data.user?.id ?? null);
    } catch {
      setEnabled(!value);
    }
  };

  return (
    <Card className="mt-6">
      <Text className="text-lg font-extrabold text-ink">Ayudar a mejorar Mochi</Text>
      <Text className="mt-2 text-sm font-semibold text-ink-muted">
        Si lo activas, medimos qué módulos usas y si algo falla, con un identificador anónimo. Nunca
        incluye datos de salud, tu ciclo, tu ánimo ni lo que escribes. Puedes desactivarlo cuando
        quieras.
      </Text>
      <Toggle
        label="Compartir estadísticas de uso"
        value={enabled}
        onValueChange={(value) => void toggle(value)}
      />
    </Card>
  );
}

export default MochiMemoryCard;
