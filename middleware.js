import { NextResponse } from "next/server";

// Le middleware Edge ne doit PAS dépendre de @supabase/ssr (incompatibilité connue avec
// le runtime Edge de Vercel selon la version résolue). On se contente ici de vérifier la
// présence du cookie de session Supabase pour décider d'une redirection rapide ; la vraie
// vérification d'authentification (avec appel réseau à Supabase) continue de se faire
// normalement côté serveur dans lib/supabaseServer.js (runtime Node.js, non concerné).

function getSupabaseProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return null;
  }
}

export function middleware(req) {
  const ref = getSupabaseProjectRef();
  const cookiePrefix = ref ? `sb-${ref}-auth-token` : null;
  const hasSession = cookiePrefix
    ? req.cookies.getAll().some((c) => c.name.startsWith(cookiePrefix) && c.value)
    : false;

  const isAuthRoute = req.nextUrl.pathname.startsWith("/login");

  if (!hasSession && !isAuthRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasSession && isAuthRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
