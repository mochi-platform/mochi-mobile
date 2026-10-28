import { tc } from "@/src/shared/theme/colors";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/src/shared/lib/supabase";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";

type VerifyState = "loading" | "success" | "error";

export function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    token_hash?: string;
    type?: string;
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  }>();

  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void verifySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifySession() {
    // Case 1: explicit error param from Supabase redirect
    if (params.error) {
      setErrorMessage(params.error_description ?? "El enlace de verificación no es válido.");
      setState("error");
      return;
    }

    // Case 1b: PKCE authorization code
    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (error) {
        setErrorMessage(error.message);
        setState("error");
      } else {
        setState("success");
      }
      return;
    }

    // Case 2: OTP token hash (email confirmation flow)
    if (params.token_hash && params.type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: params.token_hash,
        type: params.type as EmailOtpType,
      });

      if (error) {
        setErrorMessage(error.message);
        setState("error");
      } else {
        setState("success");
      }
      return;
    }

    // Case 3: access_token + refresh_token (PKCE / implicit flow)
    if (params.access_token && params.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });

      if (error) {
        setErrorMessage(error.message);
        setState("error");
      } else {
        setState("success");
      }
      return;
    }

    // Case 4: Nothing useful in params
    setErrorMessage("El enlace es inválido o ya expiró.");
    setState("error");
  }

  function goToLogin() {
    router.replace("/login");
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-purple-50 px-6 dark:bg-purple-950">
        <View className="w-full max-w-sm items-center rounded-3xl border border-purple-100 bg-white p-8 dark:border-purple-900 dark:bg-surface">
          <MochiCharacter mood="thinking" size={80} />
          <Text className="mt-4 text-center text-lg font-bold text-purple-900 dark:text-purple-100">
            Verificando tu cuenta...
          </Text>
          <Text className="mt-1 text-center text-sm text-purple-400">Solo un momento...</Text>
          <ActivityIndicator className="mt-4" color={tc("#7c3aed")} />
        </View>
      </View>
    );
  }

  // ─── Success ───────────────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <View className="flex-1 items-center justify-center bg-purple-50 px-6 dark:bg-purple-950">
        <View className="w-full max-w-sm items-center rounded-3xl border border-purple-100 bg-white p-8 dark:border-purple-900 dark:bg-surface">
          <MochiCharacter mood="happy" size={80} />

          {/* Green check circle */}
          <View className="mt-4 h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <Ionicons name="checkmark" size={36} color={tc("#16a34a")} />
          </View>

          <Text className="mt-4 text-center text-2xl font-extrabold text-purple-900 dark:text-purple-100">
            ¡Cuenta verificada!
          </Text>
          <Text className="mt-2 text-center text-sm text-purple-600 dark:text-purple-400">
            Bienvenida a Mochi
          </Text>
          <Text className="mt-3 text-center text-xs text-purple-300">
            Serás redirigida en un momento...
          </Text>
        </View>
      </View>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 items-center justify-center bg-purple-50 px-6 dark:bg-purple-950">
      <View className="w-full max-w-sm items-center rounded-3xl border border-purple-100 bg-white p-8 dark:border-purple-900 dark:bg-surface">
        <MochiCharacter mood="sleepy" size={80} />

        {/* Red X circle */}
        <View className="mt-4 h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
          <Ionicons name="close" size={36} color={tc("#dc2626")} />
        </View>

        <Text className="mt-4 text-center text-2xl font-extrabold text-purple-900 dark:text-purple-100">
          Algo salió mal
        </Text>

        {errorMessage ? (
          <Text className="mt-2 text-center text-sm text-red-500">{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          className="mt-6 items-center rounded-2xl bg-purple-600 px-6 py-3"
          onPress={goToLogin}
          activeOpacity={0.85}
        >
          <Text className="font-semibold text-white">Ir al inicio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default AuthCallbackScreen;
