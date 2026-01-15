const SUPABASE_URL = "https://ycedxxubodzefetscxvi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yhoc20Sko8NC2k3XfWeW0Q_xUrZDyNi";

let client = null;

export function getSupabaseClient() {
  if (client) return client;
  if (!window.supabase?.createClient) return null;
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
