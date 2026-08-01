"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function MarqueFilter({ marques }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const marqueActuelle = searchParams.get("marque") || "TOUTES";

  function naviguer(nouvelleMarque) {
    const params = new URLSearchParams(searchParams.toString());
    if (nouvelleMarque === "TOUTES") {
      params.delete("marque");
    } else {
      params.set("marque", nouvelleMarque);
    }
    const query = params.toString();
    router.push(query ? `/dossiers?${query}` : "/dossiers");
  }

  return (
    <select
      value={marqueActuelle}
      onChange={(e) => naviguer(e.target.value)}
      className="border border-border rounded-md px-3 py-1.5 text-sm bg-white"
    >
      <option value="TOUTES">Toutes les marques</option>
      {marques.map((m) => (
        <option key={m.id} value={m.id}>{m.nom}</option>
      ))}
    </select>
  );
}
