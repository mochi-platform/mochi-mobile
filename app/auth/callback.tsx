import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/src/shared/lib/supabase";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { Button, Caption, Display, MochiBubble, Title } from "@/src/shared/ui";

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
      <View className="flex-1 items-center justify-center bg-canvas px-6">
        <MochiCharacter expression="thinking" size={150} />
        <Title className="mt-2 text-center">Verificando tu cuenta…</Title>
        <Caption className="mt-1 text-center">Solo un momento.</Caption>
      </View>
    );
  }

  // ─── Success ───────────────────────────────────────────────────────────────
  if (state === "success") {
    return (
      <View className="flex-1 justify-center bg-canvas px-6">
        <View className="items-center">
          <MochiCharacter expression="celebrating" size={170} />
          <Display className="mt-2 text-center">¡Cuenta verificada!</Display>
        </View>
        <MochiBubble
          className="mt-4"
          tail="none"
          text="¡Qué bueno tenerte aquí! Te llevo adentro en un momento."
        />
      </View>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 justify-center bg-canvas px-6">
      <View className="items-center">
        <MochiCharacter expression="worried" size={150} />
        <Display className="mt-2 text-center">Algo salió mal</Display>
        {errorMessage ? <Caption className="mt-1 text-center">{errorMessage}</Caption> : null}
      </View>
      <View className="mt-6">
        <Button title="Ir al inicio" onPress={goToLogin} />
      </View>
    </View>
  );
}

export default AuthCallbackScreen;
