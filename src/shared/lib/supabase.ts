import { createSupabaseClient } from "@mochi/supabase/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY = "placeholder-anon-key";

function getEnvWithFallback(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

const supabaseUrl = getEnvWithFallback(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  FALLBACK_SUPABASE_URL,
);
const supabaseAnonKey = getEnvWithFallback(
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  FALLBACK_SUPABASE_ANON_KEY,
);

if (
  supabaseUrl === FALLBACK_SUPABASE_URL ||
  supabaseAnonKey === FALLBACK_SUPABASE_ANON_KEY
) {
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Using safe fallback values to avoid app startup crash.",
  );
}

export const supabase = createSupabaseClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
