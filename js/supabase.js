import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client = null;

export function getSupabaseClient() {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase environment variables are missing.");
    return null;
  }
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
