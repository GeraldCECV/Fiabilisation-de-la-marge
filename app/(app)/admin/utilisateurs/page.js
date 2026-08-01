"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AdminUtilisateursPage() {
  const router = useRouter();
  const [autorise, setAutorise] = useState(null); // null = en cours de vérif
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState(null); // { email, motDePasse } affiché après création/reset
  const [creation, setCreation] = useState(false);
  const [form, setForm] = useState({ nom: "", email: "", role: "COMMERCIAL" });

  useEffect(() => {
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push("/login"); return; }
        const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", session.user.id).single();
        if (profil?.role !== "RESPONSABLE") { setAutorise(false); return; }
        setAutorise(true);
        await chargerListe();
      } catch (e) {
        setErreur("Erreur au chargement de la page : " + (e?.message || "erreur inconnue"));
        setAutorise(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function chargerListe() {
    try {
      const res = await fetch("/api/admin/users");
      const texte = await res.text();
      let data;
      try { data = JSON.parse(texte); } catch { data = null; }
      if (!res.ok) {
        setErreur(
          (data && data.error) ||
          `Le serveur a renvoyé une erreur (${res.status}). Vérifiez que SUPABASE_SERVICE_ROLE_KEY est bien configurée sur Vercel.`
        );
        return;
      }
      setUtilisateurs(data.utilisateurs || []);
    } catch (e) {
      setErreur("Impossible de contacter le serveur : " + (e?.message || "erreur réseau"));
    }
  }

  async function creerUtilisateur(e) {
    e.preventDefault();
    setErreur("");
    setResultat(null);
    setCreation(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErreur(data.error || "Erreur lors de la création."); return; }
      setResultat({ email: data.email, motDePasse: data.motDePasse, type: "création" });
      setForm({ nom: "", email: "", role: "COMMERCIAL" });
      await chargerListe();
    } catch {
      setErreur("Erreur réseau.");
    } finally {
      setCreation(false);
    }
  }

  async function reinitialiser(userId, nom) {
    if (!confirm(`Générer un nouveau mot de passe pour ${nom} ? L'ancien cessera de fonctionner immédiatement.`)) return;
    setErreur("");
    setResultat(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) { setErreur(data.error || "Erreur lors de la réinitialisation."); return; }
      const u = utilisateurs.find((x) => x.id === userId);
      setResultat({ email: u?.email, motDePasse: data.motDePasse, type: "réinitialisation" });
    } catch {
      setErreur("Erreur réseau.");
    }
  }

  const card = { background: "#FFFFFF" };

  if (loading) return <div className="text-sub text-sm">Chargement…</div>;

  if (autorise === false) {
    return (
      <div className="max-w-lg">
        <div className="text-neg text-sm font-semibold">Accès réservé aux responsables.</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="text-[11px] tracking-widest text-accent font-bold uppercase mb-1">Administration</div>
      <h1 className="text-2xl font-extrabold text-ink mb-6">Gestion des accès</h1>

      {erreur && (
        <div className="mb-4 text-sm text-neg bg-[#FDECEA] border border-neg/30 rounded-md px-3 py-2">{erreur}</div>
      )}

      {resultat && (
        <div className="mb-6 border border-pos/40 bg-[#F3F6E9] rounded-md px-4 py-3 text-sm">
          <div className="font-bold text-ink mb-1">
            {resultat.type === "création" ? "Accès créé" : "Mot de passe réinitialisé"}
          </div>
          <div className="text-sub">
            Communiquez ces identifiants à la personne concernée (ils ne seront plus réaffichés) :
          </div>
          <div className="mt-2 font-mono text-ink bg-white border border-border rounded px-3 py-2 inline-block">
            {resultat.email} / {resultat.motDePasse}
          </div>
        </div>
      )}

      <form onSubmit={creerUtilisateur} className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="font-bold text-ink mb-4">Créer un nouvel accès</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-sub mb-1">Nom</label>
            <input
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-[#F0FFFE] text-sm"
              placeholder="Prénom Nom"
            />
          </div>
          <div>
            <label className="block text-xs text-sub mb-1">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-[#F0FFFE] text-sm"
              placeholder="prenom.nom@ypocamp.fr"
            />
          </div>
          <div>
            <label className="block text-xs text-sub mb-1">Rôle</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-border bg-[#F0FFFE] text-sm"
            >
              <option value="COMMERCIAL">Commercial</option>
              <option value="RESPONSABLE">Responsable</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-sub mt-3">
          Un mot de passe aléatoire sécurisé sera généré automatiquement et affiché une seule fois après la création.
        </div>
        <button
          type="submit"
          disabled={creation}
          className="mt-4 px-5 py-2.5 rounded-md bg-ink text-white font-bold text-sm disabled:opacity-60"
        >
          {creation ? "Création…" : "Créer l'accès"}
        </button>
      </form>

      <h2 className="font-bold text-ink mb-3">Accès existants</h2>
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-sub uppercase tracking-wide bg-[#F0FFFE]">
              <th className="px-4 py-2.5">Nom</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Rôle</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-2.5 text-ink">{u.nom}</td>
                <td className="px-4 py-2.5 text-sub">{u.email}</td>
                <td className="px-4 py-2.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E0F3F0] text-pos font-bold">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => reinitialiser(u.id, u.nom)}
                    className="text-xs text-accent hover:underline font-semibold"
                  >
                    Réinitialiser le mot de passe
                  </button>
                </td>
              </tr>
            ))}
            {utilisateurs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-4 text-sub text-center">Aucun utilisateur.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
