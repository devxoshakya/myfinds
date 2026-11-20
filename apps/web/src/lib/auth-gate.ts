const PROTECTED_PREFIXES = ["/report", "/reports", "/staff"];
const AUTH_PAGES = ["/login", "/signup"];

/**
 * Where the client guard should send the visitor, or null to stay put.
 * The session cookie is cross-origin (web and API are separate sites), so this
 * runs on the client from authClient.useSession instead of Next middleware.
 */
export function authGateRedirect(
  pathname: string,
  session: { role?: string | null } | null,
): string | null {
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!session) {
    return isProtected ? `/login?next=${encodeURIComponent(pathname)}` : null;
  }
  if (pathname === "/" || AUTH_PAGES.includes(pathname)) return "/reports";
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    return session.role === "STATION_STAFF" || session.role === "ADMIN" ? null : "/reports";
  }
  return null;
}
