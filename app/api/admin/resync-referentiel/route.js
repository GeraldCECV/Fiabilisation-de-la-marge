import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { VEHICULES, OPTIONS } from "@/scripts/seedData";

export const maxDuration = 60;

// Reproduit exactement scripts/seed.js (npm run seed), mais déclenchable depuis l'app en
// production sans terminal ni variables d'environnement locales. Idempotent : met à jour les
// modèles existants (upsert), repart de zéro pour options + compatibilités (aucun dossier de
// vente ne référence directement leur id, donc aucun risque de casser des devis existants).
export async function POST(request) {
  try {
    console.log("[RESYNC] Début resynchronisation référentiel Dreamer/Rapido");
    const supabase = supabaseServer();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", session.user.id).single();
    if (profil?.role !== "RESPONSABLE") return NextResponse.json({ error: "Réservé aux responsables" }, { status: 403 });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY manquante" }, { status: 500 });

    const admin = supabaseAdmin();

    // 1. Marques
    const marqueNoms = [...new Set(VEHICULES.map((v) => v.marque))];
    const marqueIdParNom = {};
    for (const nom of marqueNoms) {
      const { data: existing, error: selErr } = await admin.from("marques").select("id").eq("nom", nom).maybeSingle();
      if (selErr) throw new Error(`Marque ${nom}: ${selErr.message}`);
      if (existing) {
        marqueIdParNom[nom] = existing.id;
      } else {
        const { data, error } = await admin.from("marques").insert({ nom }).select().single();
        if (error) throw new Error(`Marque ${nom}: ${error.message}`);
        marqueIdParNom[nom] = data.id;
      }
    }

    // 2. Modèles — upsert, ne supprime jamais rien
    const modeleIdParCode = {};
    for (const v of VEHICULES) {
      const { data, error } = await admin
        .from("modeles")
        .upsert(
          {
            marque_id: marqueIdParNom[v.marque],
            nom: v.nom,
            gamme: v.gamme,
            type: v.type,
            collection: v.collection,
            type_carrosserie: v.typeCarrosserie || null,
            prix_usine_ht: v.prixUsineHt,
            prix_public_ttc: v.prixPublicTtc,
            actif: true,
          },
          { onConflict: "marque_id,nom" }
        )
        .select()
        .single();
      if (error) throw new Error(`Modèle ${v.nom}: ${error.message}`);
      modeleIdParCode[v.id] = data.id;
    }
    console.log(`[RESYNC] ${VEHICULES.length} modèles synchronisés`);

    // 3. Options — repart de zéro pour les marques concernées
    const marqueIds = Object.values(marqueIdParNom);
    const { error: delOptionsErr } = await admin.from("options").delete().in("marque_id", marqueIds);
    if (delOptionsErr) throw new Error("Suppression options: " + delOptionsErr.message);

    const optionIdParCode = {};
    for (const o of OPTIONS) {
      const { data, error } = await admin
        .from("options")
        .insert({
          marque_id: marqueIdParNom[o.marque],
          designation: o.nom,
          achat_ht: o.achatHt,
          cession_pose: o.cessionPose,
          prix_ttc: o.prixTtc,
          poids_kg: o.poids ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(`Option ${o.nom}: ${error.message}`);
      optionIdParCode[o.id] = data.id;
    }
    console.log(`[RESYNC] ${OPTIONS.length} options réinsérées`);

    // 4. Compatibilités — repart de zéro pour les modèles concernés
    const modeleIds = Object.values(modeleIdParCode);
    const { error: delCompatErr } = await admin.from("compatibilites").delete().in("modele_id", modeleIds);
    if (delCompatErr) throw new Error("Suppression compatibilités: " + delCompatErr.message);

    const statutMap = { O: "OPTION", S: "SERIE" };
    const rows = [];
    for (const o of OPTIONS) {
      for (const [codeVehicule, statut] of Object.entries(o.compat)) {
        if (!statut || statut === "-") continue;
        const modeleId = modeleIdParCode[codeVehicule];
        if (!modeleId) continue;
        rows.push({ modele_id: modeleId, option_id: optionIdParCode[o.id], statut: statutMap[statut] });
      }
    }

    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const { error } = await admin.from("compatibilites").insert(rows.slice(i, i + chunkSize));
      if (error) throw new Error("Compatibilités: " + error.message);
    }
    console.log(`[RESYNC] ${rows.length} lignes de compatibilité réinsérées`);

    return NextResponse.json({
      success: true,
      message: `✅ Référentiel resynchronisé : ${VEHICULES.length} modèles, ${OPTIONS.length} options, ${rows.length} compatibilités (${marqueNoms.join(", ")}).`,
    });
  } catch (err) {
    console.error("[RESYNC] ❌ Erreur :", err);
    return NextResponse.json({ error: err?.message || "Erreur serveur inattendue" }, { status: 500 });
  }
}
