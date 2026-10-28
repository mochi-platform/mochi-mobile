import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/src/shared/lib/supabase";
import { MochiCharacter } from "@/src/shared/components/MochiCharacter";
import { COLORS } from "@/src/shared/theme/tokens";
import {
  Button,
  Caption,
  Display,
  ELEVATION,
  Input,
  MochiBubble,
  MochiQuote,
  PressableScale,
} from "@/src/shared/ui";

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
    <View className="flex-1 justify-center bg-canvas px-6">
      <View className="items-center">
        <MochiCharacter expression="love" size={170} interactive />
      </View>
      <MochiBubble
        className="mt-3"
        size="lg"
        text={`¡Revisa tu correo! Te envié un enlace a ${email} para activar tu cuenta.`}
      />
      <View className="mt-6">
        <Button title="Volver" variant="soft" onPress={onBack} />
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

  const busy = loading || googleLoading;
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingVertical: 48,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-sm self-center">
          <View className="items-center">
            <MochiCharacter expression="excited" size={150} interactive />
            <Display className="mt-2 text-[38px] leading-[42px]">Mochi</Display>
            <MochiQuote className="mt-1 text-center text-[17px] leading-[23px] text-ink-muted">
              Tu compañera para estudiar, cuidarte y crecer.
            </MochiQuote>
          </View>

          <View
            className="mt-8 flex-row rounded-control bg-surface-muted p-1"
            accessibilityRole="tablist"
          >
            {(["login", "signup"] as const).map((value) => {
              const on = tab === value;
              return (
                <PressableScale
                  key={value}
                  haptics="selection"
                  onPress={() => switchTab(value)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  className={`flex-1 items-center rounded-[14px] py-2.5 ${on ? "bg-surface" : ""}`}
                  style={on ? ELEVATION[1] : undefined}
                >
                  <Text
                    className={`font-body-extrabold text-sm ${on ? "text-ink" : "text-ink-muted"}`}
                  >
                    {value === "login" ? "Iniciar sesión" : "Crear cuenta"}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          <View className="mt-6">
            <Input
              label="Correo electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!busy}
            />
            <View>
              <Input
                label="Contraseña"
                placeholder="Tu contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                editable={!busy}
                error={error}
                style={{ paddingRight: 52 }}
              />
              <PressableScale
                haptics="selection"
                onPress={() => setShowPassword((prev) => !prev)}
                disabled={busy}
                accessibilityLabel={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-2 top-[30px] h-11 w-11 items-center justify-center"
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={COLORS.inkMuted}
                />
              </PressableScale>
            </View>
          </View>

          <View className="mt-2">
            <Button
              title={tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
              loading={loading}
              disabled={googleLoading}
              onPress={() => void (tab === "login" ? signIn() : signUp())}
            />
          </View>

          {tab === "login" ? (
            <View className="mt-1 flex-row flex-wrap justify-between gap-x-3">
              {[
                { label: "Olvidé mi contraseña", run: sendPasswordReset },
                { label: "Enviarme un enlace", run: sendMagicLink },
              ].map((link) => (
                <PressableScale
                  key={link.label}
                  haptics="selection"
                  disabled={busy}
                  onPress={() => void link.run()}
                  accessibilityLabel={link.label}
                  className="min-h-[44px] justify-center"
                >
                  <Text className="font-body-extrabold text-sm text-accent-strong">
                    {link.label}
                  </Text>
                </PressableScale>
              ))}
            </View>
          ) : null}

          <View className="my-5 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-line" />
            <Caption>o continúa con</Caption>
            <View className="h-px flex-1 bg-line" />
          </View>

          <PressableScale
            onPress={() => void signInWithGoogle()}
            disabled={busy}
            accessibilityLabel="Continuar con Google"
            className="min-h-[54px] flex-row items-center justify-center gap-3 rounded-control bg-surface"
            style={ELEVATION[1]}
          >
            {googleLoading ? (
              <ActivityIndicator color={COLORS.ink} />
            ) : (
              <>
                <AntDesign name="google" size={20} color={COLORS.ink} />
                <Text className="font-body-extrabold text-[16px] text-ink">
                  Continuar con Google
                </Text>
              </>
            )}
          </PressableScale>

          <Caption className="mt-5 text-center">
            {tab === "login"
              ? "¿No tienes cuenta? Toca «Crear cuenta» arriba."
              : "Al registrarte aceptas nuestros términos de uso y la política de privacidad."}
          </Caption>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default LoginScreen;
