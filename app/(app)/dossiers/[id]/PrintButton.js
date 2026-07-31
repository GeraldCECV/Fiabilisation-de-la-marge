"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print px-4 py-2 rounded-md bg-ink text-white font-bold text-sm"
    >
      Imprimer / Enregistrer en PDF
    </button>
  );
}
