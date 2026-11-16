import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

let admin: SupabaseClient | null = null;

/** Cliente com a service role key — só existe no back-end. */
export function supabaseAdmin(): SupabaseClient {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw Object.assign(new Error("Supabase não configurado (SUPABASE_SERVICE_ROLE_KEY)."), { statusCode: 503 });
  }
  admin ??= createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export function publicImageUrl(path: string): string {
  return `${env.SUPABASE_URL}/storage/v1/object/public/${env.STORAGE_BUCKET}/${path}`;
}
