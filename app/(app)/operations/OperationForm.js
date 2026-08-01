"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function OperationForm() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function creer() {
    if (!nom.trim()) { setError("Le nom est obligatoire."); return; }
    setSaving(true);
    setError("");
    const { error } = await supabase.from("operations_commerciales").insert({
      nom: nom.trim(),
      date_debut: dateDebut || null,
      date_fin: dateFin || null,
      actif: true,
    });
    setSaving(false);
    if (error) { setError("Erreur : " + error.message); return; }
    setNom(""); setDateDebut(""); setDateFin(""); setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button onClick={() => setOuvert(true)} className="px-4 py-2 rounded-md bg-ink text-white font-bold text-sm">
        + Nouvelle opération
      </button>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-5 mb-6">
      <label className="text-xs text-sub uppercase font-bold">Nouvelle opération commerciale</label>
      <div className="grid grid-cols-4 gap-3 mt-2 items-end">
        <div className="col-span-2">
          <div className="text-xs text-sub">Nom</div>
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex : Salon de Rennes 2027" className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
        </div>
        <div>
          <div className="text-xs text-sub">Début</div>
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
        </div>
        <div>
          <div className="text-xs text-sub">Fin</div>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-full mt-1 border border-border rounded-md px-2 py-2 text-sm bg-[#FAF8F0]" />
        </div>
      </div>
      {error && <div className="text-neg text-xs mt-2">{error}</div>}
      <div className="flex gap-3 mt-3">
        <button onClick={creer} disabled={saving} className="px-4 py-2 rounded-md bg-ink text-white font-bold text-sm disabled:opacity-60">
          {saving ? "Création…" : "Créer"}
        </button>
        <button onClick={() => setOuvert(false)} className="px-4 py-2 rounded-md border border-border bg-white font-bold text-sm">Annuler</button>
      </div>
    </div>
  );
}
