"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function DashboardOperationFilter({ operations }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const operationActuelle = searchParams.get("operation") || "TOUTES";

  return (
    <select
      value={operationActuelle}
      onChange={(e) => {
        const val = e.target.value;
        router.push(val === "TOUTES" ? "/tableau-de-bord" : `/tableau-de-bord?operation=${val}`);
      }}
      className="border border-border rounded-md px-3 py-1.5 text-sm bg-white"
    >
      <option value="TOUTES">Toutes les opérations</option>
      {operations.map((o) => (
        <option key={o.id} value={o.id}>{o.nom}</option>
      ))}
    </select>
  );
}
