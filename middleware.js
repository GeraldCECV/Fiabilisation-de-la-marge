import { NextResponse } from "next/server";

export function middleware(req) {
  return new NextResponse("MIDDLEWARE MINIMAL OK - path: " + req.nextUrl.pathname, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
