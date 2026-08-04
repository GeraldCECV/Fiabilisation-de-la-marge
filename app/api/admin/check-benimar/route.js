import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante" }, { status: 500 });
    }

    const admin = supabaseAdmin();

    // Marques
    const { data: marques } = await admin.from("marques").select("id, nom");
    
    // Modèles Benimar
    const { data: modeles } = await admin
      .from("modeles")
      .select("id, nom, actif, marque_id")
      .eq("marque_id", "benimar");

    return NextResponse.json({
      marques: marques?.map((m) => m.nom) || [],
      benimar_modeles_count: modeles?.length || 0,
      benimar_actifs: modeles?.filter((m) => m.actif).length || 0,
      premiers_modeles: modeles?.slice(0, 5).map((m) => `${m.nom} (actif: ${m.actif})`) || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
