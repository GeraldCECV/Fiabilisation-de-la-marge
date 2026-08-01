"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function OperationFilter({ operations }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const operationActuelle = searchParams.get("operation") || "TOUTES";

  function naviguer(nouvelleOperation) {
    const params = new URLSearchParams(searchParams.toString());
    if (nouvelleOperation === "TOUTES") {
      params.delete("operation");
    } else {
      params.set("operation", nouvelleOperation);
    }
    const query = params.toString();
    router.push(query ? `/dossiers?${query}` : "/dossiers");
  }

  return (
    <select
      value={operationActuelle}
      onChange={(e) => naviguer(e.target.value)}
      className="border border-border rounded-md px-3 py-1.5 text-sm bg-white"
    >
      <option value="TOUTES">Toutes les opérations</option>
      {operations.map((o) => (
        <option key={o.id} value={o.id}>{o.nom}</option>
      ))}
    </select>
  );
}
