"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function DossierActions({ dossierId, statut }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmSuppression, setConfirmSuppression] = useState(false);

  async function marquerVendu() {
    setBusy(true);
    const { error } = await supabase
      .from("dossiers_vente")
      .update({ statut: "VENDU", verrouille: true, updated_at: new Date().toISOString() })
      .eq("id", dossierId);
    setBusy(false);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    router.refresh();
  }

  async function supprimer() {
    setBusy(true);
    const { error } = await supabase.from("dossiers_vente").delete().eq("id", dossierId);
    setBusy(false);
    if (error) {
      alert("Erreur : " + error.message);
      return;
    }
    router.push("/dossiers");
    router.refresh();
  }

  return (
    <div className="no-print flex gap-3 items-center">
      {statut !== "VENDU" && (
        <button
          onClick={marquerVendu}
          disabled={busy}
          className="px-4 py-2 rounded-md bg-pos text-white font-bold text-sm disabled:opacity-60"
          style={{ background: "#8A9548" }}
        >
          Marquer vendu
        </button>
      )}

      {!confirmSuppression ? (
        <button
          onClick={() => setConfirmSuppression(true)}
          disabled={busy}
          className="px-4 py-2 rounded-md border border-neg text-neg font-bold text-sm disabled:opacity-60"
          style={{ borderColor: "#EC655D", color: "#EC655D" }}
        >
          Supprimer
        </button>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neg" style={{ color: "#EC655D" }}>Confirmer la suppression ?</span>
          <button onClick={supprimer} disabled={busy} className="px-3 py-1.5 rounded-md text-white text-xs font-bold" style={{ background: "#EC655D" }}>
            Oui, supprimer
          </button>
          <button onClick={() => setConfirmSuppression(false)} className="px-3 py-1.5 rounded-md border border-border text-xs font-bold">
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
