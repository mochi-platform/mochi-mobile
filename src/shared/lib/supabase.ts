import { createSupabaseClient } from "@mochi/supabase/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  "https://invalid.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || "invalid-anon-key";

if (
  !process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ||
  !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()
) {
  console.error(
    "[Supabase] Variables de entorno faltantes: EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY son requeridas",
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
