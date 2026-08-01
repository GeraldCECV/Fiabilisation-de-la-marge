import { createClient } from "@supabase/supabase-js";

// ATTENTION : n'importer ce client que dans du code serveur (routes API, actions serveur).
// La clé service_role contourne toutes les policies RLS — ne jamais l'exposer au navigateur.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
