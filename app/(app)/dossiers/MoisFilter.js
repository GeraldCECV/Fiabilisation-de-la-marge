"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function MoisFilter({ options }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moisActuel = searchParams.get("mois") || "TOUS";

  return (
    <select
      value={moisActuel}
      onChange={(e) => {
        const val = e.target.value;
        router.push(val === "TOUS" ? "/dossiers" : `/dossiers?mois=${val}`);
      }}
      className="border border-border rounded-md px-3 py-1.5 text-sm bg-white"
    >
      <option value="TOUS">Tous les mois</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
