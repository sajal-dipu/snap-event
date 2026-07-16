import { NextResponse, type NextRequest } from "next/server";

function getRoleCookie(req: NextRequest): string | null {
  return req.cookies.get("snapEvent-role")?.value ?? null;
}

const AUTH_ONLY_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth/login", "/auth/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = getRoleCookie(request);
  const isLoggedIn = role !== null;

  // ── 1. Protect admin routes ──────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (isLoggedIn && role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (!isLoggedIn) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── 2. Protect photographer dashboard routes ─────────────
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role !== "photographer") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── 3. Protect user/client routes ────────────────────────
  if (pathname.startsWith("/user/")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (role !== "user" && role !== "customer") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── 4. Protect general protected routes ──────────────────
  if (pathname.startsWith("/onboarding") || pathname.startsWith("/rooms")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── 5. Already-logged-in users shouldn't see auth pages ──
  const isAuthRoute = AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isAuthRoute && isLoggedIn) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (role === "photographer") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (role === "user" || role === "customer") {
      return NextResponse.redirect(new URL("/user/dashboard", request.url));
    }
  }

  const response = NextResponse.next();
  // Apply Cache-Control to protected routes
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/onboarding")
  ) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf)).*)",
  ],
};
