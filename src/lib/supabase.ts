import { createClient } from "@supabase/supabase-js";

// ✅ Sab credentials sirf .env se aate hain — koi hardcoded value nahi
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // No database configured yet — the app falls back to built-in demo data
  // instead of crashing the whole site.
  console.warn(
    "Supabase credentials missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Running with local demo data.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "public-anon-key-placeholder",
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
