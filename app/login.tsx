import { tc } from "@/src/shared/theme/colors";
import { useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  type ImageSourcePropType,
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
    <View className="flex-1 items-center justify-center bg-purple-50 px-6 dark:bg-purple-950">
      {/* Decorative circles */}
      <View className="absolute -left-16 -top-16 h-52 w-52 rounded-full bg-pink-200 opacity-60 dark:bg-pink-800" />
      <View className="absolute -bottom-20 -right-20 h-52 w-52 rounded-full bg-purple-200 opacity-60 dark:bg-purple-800" />

      <View className="w-full max-w-sm items-center rounded-3xl border border-purple-100 bg-white p-8 shadow-sm dark:border-purple-900 dark:bg-surface">
        <MochiCharacter mood="happy" size={100} />

        <Text className="mt-4 text-center text-2xl font-extrabold text-purple-900 dark:text-purple-100">
          ¡Revisa tu correo!
        </Text>

        <Text className="mt-2 text-center text-sm text-purple-500">
          {"Te enviamos un enlace de verificación a\n"}
          <Text className="font-semibold text-purple-700 dark:text-purple-300">{email}</Text>
          {"\n\nHaz clic en el enlace para activar tu cuenta."}
        </Text>

        <TouchableOpacity
          className="mt-6 rounded-2xl bg-purple-100 px-6 py-3 dark:bg-purple-900"
          onPress={onBack}
        >
          <Text className="font-semibold text-purple-700 dark:text-purple-300">Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────

export function LoginScreen() {
  const backgroundImageSource: ImageSourcePropType = require("@/assets/auth-blk.png");
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

  async function sendPasswordReset() {
    if (!email.trim()) {
      setError("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL("auth/reset"),
    });
    setLoading(false);
    if (resetError) {
      setError("No se pudo enviar el correo. Intenta de nuevo en unos minutos.");
      return;
    }
    setError("Si el correo existe, te enviamos un enlace para cambiar tu contraseña.");
  }

  async function sendMagicLink() {
    if (!email.trim()) {
      setError("Escribe tu correo para enviarte el enlace de acceso.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: Linking.createURL("auth/callback") },
    });
    setLoading(false);
    if (otpError) {
      setError("No se pudo enviar el enlace. Intenta de nuevo en unos minutos.");
      return;
    }
    setEmailSent(true);
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

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success") {
        const url = result.url;
        const query = url.split("#")[0].split("?")[1] ?? "";
        const code = new URLSearchParams(query).get("code");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setError("No se pudo completar la sesión. Intenta de nuevo.");
          }
        } else {
          setError("No se pudo completar la sesión. Intenta de nuevo.");
        }
      } else if (result.type === "cancel" || result.type === "dismiss") {
        // User cancelled or dismissed the browser — no error needed
      } else {
        setError("No se pudo iniciar sesión con Google. Intenta de nuevo.");
      }
    } catch {
      setError("Ocurrió un error. Intenta de nuevo.");
    } finally {
      setGoogleLoading(false);
    }
  }

  // Show email-sent confirmation screen after successful signup
  if (emailSent) {
    return <EmailSentScreen email={email} onBack={resetForm} />;
  }

  const content = (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
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
        <View className="w-full max-w-sm">
          {/* Branding */}
          <View className="items-center">
            <MochiCharacter mood="excited" size={100} />
            <Text className="mt-3 text-4xl font-extrabold text-purple-900 dark:text-purple-100">
              Mochi
            </Text>
            <Text className="mt-1 text-base font-medium text-purple-500">
              Tu asistente de estudio
            </Text>
          </View>

          {/* Tab toggle */}
          <View className="mt-8 flex-row rounded-2xl bg-purple-100 p-1 dark:bg-purple-900">
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
              className="rounded-3xl border-2 border-purple-200 bg-white px-5 py-4 text-base text-purple-900 dark:border-purple-800 dark:bg-surface dark:text-purple-100"
              placeholder="Correo electrónico"
              placeholderTextColor={tc("#c4b5fd")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading && !googleLoading}
            />

            <View className="mt-4 flex-row items-center rounded-3xl border-2 border-purple-200 bg-white px-5 dark:border-purple-800 dark:bg-surface">
              <TextInput
                className="flex-1 py-4 text-base text-purple-900 dark:text-purple-100"
                placeholder="Contraseña"
                placeholderTextColor={tc("#c4b5fd")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                editable={!loading && !googleLoading}
              />
              <TouchableOpacity
                className="ml-2 rounded-full p-1"
                onPress={() => setShowPassword((prev) => !prev)}
                disabled={loading || googleLoading}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={tc("#7e22ce")} />
              </TouchableOpacity>
            </View>

            {error ? <Text className="mt-2 text-sm text-red-500">{error}</Text> : null}
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
              <ActivityIndicator color={tc("#ffffff")} />
            ) : (
              <Text className="text-lg font-extrabold text-white">
                {tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </Text>
            )}
          </TouchableOpacity>

          {tab === "login" ? (
            <View className="mt-3 flex-row justify-between">
              <TouchableOpacity
                accessibilityRole="button"
                className="min-h-[44px] justify-center"
                onPress={() => void sendPasswordReset()}
                disabled={loading || googleLoading}
              >
                <Text className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  Olvidé mi contraseña
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                className="min-h-[44px] justify-center"
                onPress={() => void sendMagicLink()}
                disabled={loading || googleLoading}
              >
                <Text className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  Enviarme un enlace
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Divider */}
          <View className="mt-6 flex-row items-center gap-2">
            <View className="flex-1 border-t border-purple-200 dark:border-purple-800" />
            <Text className="text-xs font-semibold text-purple-500">o continúa con</Text>
            <View className="flex-1 border-t border-purple-200 dark:border-purple-800" />
          </View>

          {/* Google button */}
          <IconCtaButton
            label="Continuar con Google"
            onPress={() => {
              void signInWithGoogle();
            }}
            icon={<AntDesign name="google" size={24} color="black" />}
            loading={googleLoading}
            loadingColor={tc("#1f2937")}
            disabled={loading}
            containerClassName="mt-4 w-full rounded-3xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-surface py-4"
            textClassName="text-gray-800 dark:text-gray-200"
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

  if (!backgroundImageSource) {
    return content;
  }

  return (
    <ImageBackground source={backgroundImageSource} className="flex-1">
      {content}
    </ImageBackground>
  );
}

export default LoginScreen;
