import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Vérifie que l'appelant est connecté et RESPONSABLE. Renvoie null si OK, sinon une réponse d'erreur.
async function verifierResponsable() {
  const supabase = supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const { data: profil } = await supabase
    .from("utilisateurs")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (profil?.role !== "RESPONSABLE") {
    return NextResponse.json({ error: "Réservé aux responsables." }, { status: 403 });
  }
  return null;
}

function genererMotDePasse() {
  const majuscules = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const minuscules = "abcdefghijkmnpqrstuvwxyz";
  const chiffres = "23456789";
  const speciaux = "!@#%*-_";
  const tout = majuscules + minuscules + chiffres + speciaux;
  const alea = (s) => s[Math.floor(Math.random() * s.length)];
  let mdp = alea(majuscules) + alea(minuscules) + alea(chiffres) + alea(speciaux);
  for (let i = 0; i < 8; i++) mdp += alea(tout);
  return mdp.split("").sort(() => Math.random() - 0.5).join("");
}

function verifierCleServiceRole() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY n'est pas configurée sur le serveur (Vercel > Settings > Environment Variables)." },
      { status: 500 }
    );
  }
  return null;
}

export async function GET() {
  const erreur = await verifierResponsable();
  if (erreur) return erreur;
  const erreurCle = verifierCleServiceRole();
  if (erreurCle) return erreurCle;

  try {
    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("utilisateurs")
      .select("id, nom, role, marques_autorisees, created_at")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // On récupère les emails depuis auth.users (pas stockés dans la table utilisateurs)
    const { data: authList, error: errAuthList } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (errAuthList) return NextResponse.json({ error: errAuthList.message }, { status: 500 });
    const emailParId = Object.fromEntries((authList?.users || []).map((u) => [u.id, u.email]));
    const resultats = data.map((u) => ({ ...u, email: emailParId[u.id] || null }));

    return NextResponse.json({ utilisateurs: resultats });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Erreur serveur inattendue." }, { status: 500 });
  }
}

export async function POST(request) {
  const erreur = await verifierResponsable();
  if (erreur) return erreur;
  const erreurCle = verifierCleServiceRole();
  if (erreurCle) return erreurCle;

  const body = await request.json();
  const { nom, email, role, marques_autorisees } = body;

  if (!nom || !email) {
    return NextResponse.json({ error: "Nom et email sont requis." }, { status: 400 });
  }
  if (role && !["RESPONSABLE", "COMMERCIAL"].includes(role)) {
    return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
  }

  const motDePasse = genererMotDePasse();
  const admin = supabaseAdmin();

  const { data: created, error: errAuth } = await admin.auth.admin.createUser({
    email,
    password: motDePasse,
    email_confirm: true,
  });
  if (errAuth) {
    return NextResponse.json({ error: errAuth.message }, { status: 400 });
  }

  const { error: errProfil } = await admin.from("utilisateurs").insert({
    id: created.user.id,
    nom,
    role: role || "COMMERCIAL",
    marques_autorisees: marques_autorisees || [],
  });
  if (errProfil) {
    // On nettoie le compte auth orphelin si l'insertion du profil échoue
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: errProfil.message }, { status: 500 });
  }

  return NextResponse.json({ email, motDePasse });
}

// Réinitialise le mot de passe d'un utilisateur existant et renvoie le nouveau mot de passe.
export async function PATCH(request) {
  const erreur = await verifierResponsable();
  if (erreur) return erreur;
  const erreurCle = verifierCleServiceRole();
  if (erreurCle) return erreurCle;

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: "userId requis." }, { status: 400 });

  const motDePasse = genererMotDePasse();
  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: motDePasse });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ motDePasse });
}
