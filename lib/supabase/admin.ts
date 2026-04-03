import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function getSupabaseAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

