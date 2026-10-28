import { COLORS } from "@/src/shared/theme/tokens";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/src/shared/lib/supabase";
import { Button, Input } from "@/src/shared/ui";

type Phase = "verifying" | "form" | "invalid" | "done";

export function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!params.code) {
        setPhase("invalid");
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
      setPhase(exchangeError ? "invalid" : "form");
    })();
  }, [params.code]);

  async function savePassword() {
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setError(null);
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError("No se pudo cambiar la contraseña. Pide un enlace nuevo.");
      return;
    }
    setPhase("done");
  }

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-1 justify-center px-6">
        {phase === "verifying" ? <ActivityIndicator color={COLORS.accent} /> : null}

        {phase === "invalid" ? (
          <>
            <Text className="text-xl font-extrabold text-ink">Enlace no válido</Text>
            <Text className="mb-6 mt-2 text-sm text-ink-muted">
              El enlace expiró o ya se usó. Pide uno nuevo desde "Olvidé mi contraseña".
            </Text>
            <Button title="Volver a iniciar sesión" onPress={() => router.replace("/login")} />
          </>
        ) : null}

        {phase === "form" ? (
          <>
            <Text className="mb-4 text-xl font-extrabold text-ink">Nueva contraseña</Text>
            <Input
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              editable={!saving}
              error={error}
            />
            <Button
              title="Guardar contraseña"
              loading={saving}
              onPress={() => void savePassword()}
            />
          </>
        ) : null}

        {phase === "done" ? (
          <>
            <Text className="mb-6 text-xl font-extrabold text-ink">Contraseña actualizada</Text>
            <Button title="Continuar" onPress={() => router.replace("/")} />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

export default ResetPasswordScreen;
