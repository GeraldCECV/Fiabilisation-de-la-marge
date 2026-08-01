"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function OperationToggle({ id, actif }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function basculer() {
    setBusy(true);
    await supabase.from("operations_commerciales").update({ actif: !actif }).eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <button onClick={basculer} disabled={busy} className="text-xs font-bold underline text-sub disabled:opacity-60">
      {actif ? "Archiver" : "Réactiver"}
    </button>
  );
}
