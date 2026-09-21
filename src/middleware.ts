import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Read a JWT claim from the payload without verifying the signature
 *  (runs on the Edge runtime, no crypto needed — only used for routing). */
function readClaim(token: string | undefined, claim: string): unknown {
  if (!token) return undefined;
  const parts = token.split(".");
  if (parts.length < 2) return undefined;
  let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  try {
    return JSON.parse(atob(b64))[claim];
  } catch {
    return undefined;
  }
}

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const isTestAccount = readClaim(accessToken, "test") === true;
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/", "/login", "/commencer", "/forget-password", "/signup", "/pricing", "/_not-found", "/api"];

  const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/"));

  // If already authenticated and trying to access login page, redirect to /commencer
  if (pathname === "/login" && accessToken) {
    return NextResponse.redirect(new URL("/commencer", request.url));
  }

  // /test = public demo mode: every anonymous browser gets its own throwaway
  // cabinet. Test sessions are identified by the `test: true` JWT claim of
  // their admin token.
  //   - A REAL account (test !== true) trying /test → 404 (test reserved for
  //     non-authenticated browsers / demo sessions).
  //   - Test admin (test: true) hitting /app → redirected to their test home,
  //     they may not use the real app.
  if (pathname.startsWith("/test")) {
    if (accessToken && !isTestAccount) {
      return NextResponse.redirect(new URL("/404", request.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath) {
    return NextResponse.next();
  }

  // If trying to access /app/* without token, redirect to login
  if (pathname.startsWith("/app")) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Test admins can never enter the real app.
    if (isTestAccount) {
      return NextResponse.redirect(new URL("/test/agent", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};