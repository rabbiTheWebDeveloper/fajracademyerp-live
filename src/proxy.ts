import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify, type JWTPayload } from "jose";

interface CustomJWTPayload extends JWTPayload {
  id?: string;
  role?: string;
  fullName?: string;
}

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/teacher-registration",
  "/student-registration",
  "/verify",
  "/api/verify",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/upload",
  "/api/teachers",
  "/api/courses",
  "/api/students"
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

const ROLE_PATHS = {
  "/student": ["student", "admin", "super-admin"],
  "/teacher": ["teacher", "admin", "super-admin"],
  "/staff":   ["staff", "sales", "marketing", "bd", "cam", "customer-executive", "admin", "super-admin"],
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  let payload: CustomJWTPayload | null = null;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const verified = await jwtVerify(token, secret);
      payload = verified.payload as CustomJWTPayload;
    } catch {
      // Invalid/expired token
    }
  }

  // Allow public paths and static files (inject headers if authenticated)
  if (isPublicPath(pathname) || pathname.startsWith("/_next") || pathname.includes(".")) {
    if (payload) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", payload.id as string);
      requestHeaders.set("x-user-role", payload.role as string);
      requestHeaders.set("x-user-name", (payload.fullName as string) || "");
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    return NextResponse.next();
  }

  // No token → redirect or return 401
  if (!token || !payload) {
    if (pathname.startsWith("/api")) {
      const res = NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      if (token) res.cookies.delete("auth_token");
      return res;
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    const res = NextResponse.redirect(loginUrl);
    if (token) res.cookies.delete("auth_token");
    return res;
  }

  try {
    const role = (payload.role as string) || "";

    // Redirect root / to the user's role portal
    if (pathname === "/") {
      if (role === "student") {
        return NextResponse.redirect(new URL("/student", request.url));
      }
      if (role === "teacher") {
        return NextResponse.redirect(new URL("/teacher", request.url));
      }
      if (role === "staff" || ["sales", "marketing", "bd", "cam", "customer-executive"].includes(role)) {
        return NextResponse.redirect(new URL("/staff", request.url));
      }
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Check role-based access
    for (const [pathPrefix, allowedRoles] of Object.entries(ROLE_PATHS)) {
      if ((pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`)) && !allowedRoles.includes(payload.role as string)) {
        // Redirect to login if wrong role
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // Inject user info into headers for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.id as string);
    requestHeaders.set("x-user-role", payload.role as string);
    requestHeaders.set("x-user-name", (payload.fullName as string) || "");

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (err) {
    // Invalid/expired token → redirect or return 401
    if (pathname.startsWith("/api")) {
      const response = NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      response.cookies.delete("auth_token");
      return response;
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
