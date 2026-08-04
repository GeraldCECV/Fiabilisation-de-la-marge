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
  const [seedEnCours, setSeedEnCours] = useState(false);
  const [resyncEnCours, setResyncEnCours] = useState(false);
  const [form, setForm] = useState({ nom: "", email: "", role: "COMMERCIAL" });

  useEffect(() => {
    (async () => {
      try {
        console.log("Admin page: checking session...");
        const supabase = supabaseBrowser();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { console.log("Admin page: no session"); router.push("/login"); return; }
        
        console.log("Admin page: checking role...");
        const { data: profil } = await supabase.from("utilisateurs").select("role").eq("id", session.user.id).single();
        if (profil?.role !== "RESPONSABLE") { console.log("Admin page: not RESPONSABLE"); setAutorise(false); return; }
        
        console.log("Admin page: loading users...");
        setAutorise(true);
        await chargerListe();
      } catch (e) {
        console.error("Admin page error:", e);
        setErreur("Erreur au chargement de la page : " + (e?.message || "erreur inconnue"));
        setAutorise(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function chargerListe() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // timeout 10s
      
      const res = await fetch("/api/admin/users", { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const texte = await res.text();
      let data;
      try { data = JSON.parse(texte); } catch { data = null; }
      
      if (!res.ok) {
        setErreur(
          (data && data.error) ||
          `Serveur erreur (${res.status}). Vérifiez que SUPABASE_SERVICE_ROLE_KEY est bien configurée sur Vercel.`
        );
        return;
      }
      setUtilisateurs(data.utilisateurs || []);
    } catch (e) {
      if (e.name === 'AbortError') {
        setErreur("Timeout : le serveur ne répond pas après 10 secondes");
      } else {
        setErreur("Impossible de contacter le serveur : " + (e?.message || "erreur réseau"));
      }
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
            {resultat.type === "création"
              ? "Accès créé"
              : resultat.type === "réinitialisation"
              ? "Mot de passe réinitialisé"
              : "Intégration complète"}
          </div>
          {resultat.type === "seed" ? (
            <div className="text-sub mt-1">{resultat.motDePasse}</div>
          ) : (
            <>
              <div className="text-sub">
                Communiquez ces identifiants à la personne concernée (ils ne seront plus réaffichés) :
              </div>
              <div className="mt-2 font-mono text-ink bg-white border border-border rounded px-3 py-2 inline-block">
                {resultat.email} / {resultat.motDePasse}
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl p-6 mb-8">
        <h2 className="font-bold text-ink mb-3">Intégration données</h2>
        <button
          disabled={seedEnCours}
          onClick={async () => {
            if (!confirm("Seeder Benimar 2027 (38 modèles + 9 options) ? Cette action est idempotente.")) return;
            setResultat(null);
            setErreur("");
            setSeedEnCours(true);
            try {
              console.log("Début du seed Benimar...");
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 45000); // timeout 45s
              
              const res = await fetch("/api/admin/seed-benimar", { 
                method: "POST",
                signal: controller.signal,
              });
              clearTimeout(timeout);
              
              console.log("Réponse reçue :", res.status);
              const text = await res.text();
              console.log("Contenu :", text);
              
              let data;
              try { data = JSON.parse(text); } catch { data = null; }
              
              if (!res.ok) {
                const errMsg = data?.error || text || `Erreur ${res.status}`;
                console.error("Erreur seed :", errMsg);
                setErreur(errMsg);
                return;
              }
              
              console.log("Seed réussi :", data);
              setResultat({ email: "Benimar", motDePasse: data.message, type: "seed" });
              await chargerListe(); // Recharger la liste
            } catch (err) {
              console.error("Erreur fetch :", err);
              if (err.name === 'AbortError') {
                setErreur("Timeout : le serveur a mis trop longtemps à répondre (45s). Vérifiez SUPABASE_SERVICE_ROLE_KEY sur Vercel, ou réessayez : l'opération est idempotente.");
              } else {
                setErreur("Erreur : " + (err?.message || "réseau"));
              }
            } finally {
              setSeedEnCours(false);
            }
          }}
          className="px-5 py-2.5 rounded-md bg-pos text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {seedEnCours ? "Intégration en cours..." : "Intégrer Benimar 2027"}
        </button>

        <button
          disabled={resyncEnCours}
          onClick={async () => {
            if (!confirm("Resynchroniser le référentiel Dreamer/Rapido (modèles, options, packs, compatibilités) depuis scripts/seedData.js ? Cette action est idempotente : les modèles sont mis à jour, les options/compatibilités sont reconstruites intégralement.")) return;
            setResultat(null);
            setErreur("");
            setResyncEnCours(true);
            try {
              console.log("Début resync référentiel...");
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 45000);

              const res = await fetch("/api/admin/resync-referentiel", {
                method: "POST",
                signal: controller.signal,
              });
              clearTimeout(timeout);

              const text = await res.text();
              let data;
              try { data = JSON.parse(text); } catch { data = null; }

              if (!res.ok) {
                setErreur(data?.error || text || `Erreur ${res.status}`);
                return;
              }

              setResultat({ email: "Référentiel", motDePasse: data.message, type: "seed" });
              await chargerListe();
            } catch (err) {
              if (err.name === "AbortError") {
                setErreur("Timeout : le serveur a mis trop longtemps à répondre (45s). Réessayez : l'opération est idempotente.");
              } else {
                setErreur("Erreur : " + (err?.message || "réseau"));
              }
            } finally {
              setResyncEnCours(false);
            }
          }}
          className="ml-3 px-5 py-2.5 rounded-md bg-accent text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resyncEnCours ? "Resynchronisation..." : "Resynchroniser Dreamer/Rapido"}
        </button>
      </div>

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
