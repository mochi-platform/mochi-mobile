import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/src/shared/lib/supabase";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { IconCtaButton } from "@/src/shared/components/IconCtaButton";

// Ensure WebBrowser auth session complettion on app startup
WebBrowser.maybeCompleteAuthSession();

type Tab = "login" | "signup";

// ─── Email Sent confirmation screen ──────────────────────────────────────────

type EmailSentScreenProps = {
  email: string;
  onBack: () => void;
};

function EmailSentScreen({ email, onBack }: EmailSentScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-purple-50 px-6">
      {/* Decorative circles */}
      <View className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-pink-200 opacity-60" />
      <View className="absolute -bottom-20 -right-20 h-52 w-52 rounded-full bg-purple-200 opacity-60" />

      <View className="w-full max-w-sm items-center rounded-3xl border border-purple-100 bg-white p-8 shadow-sm">
        <MochiCharacter mood="happy" size={100} />

        <Text className="mt-4 text-center text-2xl font-extrabold text-purple-900">
          ¡Revisa tu correo!
        </Text>

        <Text className="mt-2 text-center text-sm text-purple-500">
          {"Te enviamos un enlace de verificación a\n"}
          <Text className="font-semibold text-purple-700">{email}</Text>
          {"\n\nHaz clic en el enlace para activar tu cuenta."}
        </Text>

        <TouchableOpacity
          className="mt-6 rounded-2xl bg-purple-100 px-6 py-3"
          onPress={onBack}
        >
          <Text className="font-semibold text-purple-700">Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

export function LoginScreen() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  function resetForm() {
    setError(null);
    setEmail("");
    setPassword("");
    setEmailSent(false);
    setTab("login");
  }

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
    setShowPassword(false);
  }

  async function signIn() {
    if (!email.trim() || !password) {
      setError("Por favor ingresa tu correo y contraseña.");
      return;
    }

    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message.includes("Invalid login credentials")
          ? "Correo o contraseña incorrectos. Inténtalo de nuevo."
          : authError.message,
      );
    }

    setLoading(false);
  }

  async function signUp() {
    if (!email.trim() || !password) {
      setError("Por favor ingresa tu correo y contraseña.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setError(null);
    setLoading(true);

    const redirectTo = Linking.createURL("auth/callback");

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setEmailSent(true);
    }

    setLoading(false);
  }

  /**
   * Google OAuth Sign-In
   *
   * IMPORTANT: The following redirect URL must be configured in Supabase:
   * Authentication → URL Configuration → Redirect URLs
   * Add: mochi://auth/callback
   *
   * This uses Supabase's recommended OAuth flow for Expo with WebBrowser.
   */
  async function signInWithGoogle() {
    setError(null);
    setGoogleLoading(true);

    try {
      const redirectTo = Linking.createURL("auth/callback");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) {
        setError("No se pudo iniciar sesión con Google. Intenta de nuevo.");
        setGoogleLoading(false);
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      if (result.type === "success") {
        const url = result.url;
        // Extract tokens from the URL hash or query string
        const fragment = url.split("#")[1] ?? url.split("?")[1];
        const params = new URLSearchParams(fragment ?? "");
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          // Set the session with the tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            setError("No se pudo completar la sesión. Intenta de nuevo.");
          }
        }
      } else if (result.type === "cancel" || result.type === "dismiss") {
        // User cancelled or dismissed the browser — no error needed
      } else {
        setError("No se pudo iniciar sesión con Google. Intenta de nuevo.");
      }
    } catch (err) {
      setError("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setGoogleLoading(false);
    }
  }

  // Show email-sent confirmation screen after successful signup
  if (emailSent) {
    return <EmailSentScreen email={email} onBack={resetForm} />;
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1 bg-purple-50"
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Decorative circles */}
        <View className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-pink-200 opacity-60" />
        <View className="absolute -bottom-20 -right-20 h-52 w-52 rounded-full bg-purple-200 opacity-60" />

        {/* Sparkle badge — top-right */}
        <View className="absolute right-6 top-14 items-center justify-center rounded-xl bg-yellow-100 p-2">
          <Ionicons name="sparkles" size={18} color="#ca8a04" />
        </View>

        {/* Heart badge — bottom-left */}
        <View className="absolute bottom-14 left-6 items-center justify-center rounded-xl bg-pink-100 p-2">
          <Ionicons name="heart" size={18} color="#db2777" />
        </View>

        <View className="w-full max-w-sm">
          {/* Branding */}
          <View className="items-center">
            <MochiCharacter mood="excited" size={100} />
            <Text className="mt-3 text-4xl font-extrabold text-purple-900">
              Mochi
            </Text>
            <Text className="mt-1 text-base font-medium text-purple-500">
              Tu asistente de estudio
            </Text>
          </View>

          {/* Tab toggle */}
          <View className="mt-8 flex-row rounded-2xl bg-purple-100 p-1">
            <TouchableOpacity
              className={`flex-1 items-center rounded-xl py-2.5 ${tab === "login" ? "bg-purple-600" : "bg-transparent"}`}
              onPress={() => switchTab("login")}
              activeOpacity={0.8}
            >
              <Text
                className={`text-sm font-semibold ${tab === "login" ? "text-white" : "text-purple-400"}`}
              >
                Iniciar sesión
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 items-center rounded-xl py-2.5 ${tab === "signup" ? "bg-purple-600" : "bg-transparent"}`}
              onPress={() => switchTab("signup")}
              activeOpacity={0.8}
            >
              <Text
                className={`text-sm font-semibold ${tab === "signup" ? "text-white" : "text-purple-400"}`}
              >
                Crear cuenta
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View className="mt-6">
            <TextInput
              className="rounded-3xl border-2 border-purple-200 bg-white px-5 py-4 text-base text-purple-900"
              placeholder="Correo electrónico"
              placeholderTextColor="#c4b5fd"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading && !googleLoading}
            />

            <View className="mt-4 flex-row items-center rounded-3xl border-2 border-purple-200 bg-white px-5">
              <TextInput
                className="flex-1 py-4 text-base text-purple-900"
                placeholder="Contraseña"
                placeholderTextColor="#c4b5fd"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete={
                  tab === "signup" ? "new-password" : "current-password"
                }
                editable={!loading && !googleLoading}
              />
              <TouchableOpacity
                className="ml-2 rounded-full p-1"
                onPress={() => setShowPassword((prev) => !prev)}
                disabled={loading || googleLoading}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#7e22ce"
                />
              </TouchableOpacity>
            </View>

            {error ? (
              <Text className="mt-2 text-sm text-red-500">{error}</Text>
            ) : null}
          </View>

          {/* Submit button */}
          <TouchableOpacity
            className="mt-6 items-center rounded-3xl bg-purple-600 py-4 disabled:opacity-60"
            onPress={() => {
              void (tab === "login" ? signIn() : signUp());
            }}
            disabled={loading || googleLoading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-lg font-extrabold text-white">
                {tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View className="mt-6 flex-row items-center gap-2">
            <View className="flex-1 border-t border-purple-200" />
            <Text className="text-xs font-semibold text-purple-500">
              o continúa con
            </Text>
            <View className="flex-1 border-t border-purple-200" />
          </View>

          {/* Google button */}
          <IconCtaButton
            label="Continuar con Google"
            onPress={() => {
              void signInWithGoogle();
            }}
            icon={<AntDesign name="google" size={24} color="black" />}
            loading={googleLoading}
            loadingColor="#1f2937"
            disabled={loading}
            containerClassName="mt-4 w-full rounded-3xl border-2 border-gray-200 bg-white py-4"
            textClassName="text-gray-800"
          />

          {/* Soft hint */}
          <Text className="mt-4 text-center text-xs text-purple-300">
            {tab === "login"
              ? "¿No tienes cuenta? Cambia a Crear cuenta arriba."
              : "Al registrarte aceptas nuestros términos de uso."}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default LoginScreen;
