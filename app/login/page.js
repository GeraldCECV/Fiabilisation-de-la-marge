"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Identifiants incorrects. Contactez votre responsable pour réinitialiser votre accès.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-surface border border-border rounded-xl p-8 shadow-sm">
        <img src="/images/logo-ypocamp.png" alt="Ypocamp" className="h-20 w-auto mx-auto mb-5" />
        <div className="text-[11px] tracking-widest text-accent font-bold uppercase mb-1 text-center">Trame de rentabilité VN</div>
        <h1 className="text-xl font-extrabold mb-6 text-center">Connexion</h1>

        <label className="block text-xs text-sub mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-md border border-border bg-[#FCFBF8] text-sm"
        />

        <label className="block text-xs text-sub mb-1">Mot de passe</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-md border border-border bg-[#FCFBF8] text-sm"
        />

        {error && <div className="text-neg text-xs mb-4">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-md bg-accent text-white font-bold text-sm disabled:opacity-60"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>

        <p className="text-xs text-sub mt-4">
          Les comptes sont créés par un responsable depuis Supabase (Authentication → Users). Aucune auto-inscription.
        </p>
      </form>
    </div>
  );
}
