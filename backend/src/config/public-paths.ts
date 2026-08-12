// Single source of truth for the routes that may be reached without an authenticated
// session. Everything not listed here is denied by defaultAuthGuard.
//
// Adding an entry makes a route publicly reachable - it must be a deliberate,
// reviewed change. The auth tests import this list, so a route added here without
// intent shows up as a diff in the allow-list rather than as a silently open endpoint.
//
// Only routes registered through routing-controllers need to be listed. The SAML
// endpoints and the bare `/health` liveness probe are plain express handlers mounted
// before the guard in app.ts, so they never reach it.

/** Paths (relative to BASE_URL_PREFIX) reachable without authentication. */
export const PUBLIC_PATHS: readonly string[] = ['/', '/health/up'];

/** Strips a single trailing slash so '/health/up/' matches '/health/up'. Keeps a bare '/'. */
const normalizePath = (path: string): string => (path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path);

/**
 * Exact-match check against PUBLIC_PATHS.
 *
 * Matching is exact rather than prefix-based on purpose: a prefix match on '/' would
 * make the entire API public, and a prefix match on any future entry could expose
 * sibling routes that merely share a path segment.
 */
export const isPublicPath = (path: string): boolean => PUBLIC_PATHS.includes(normalizePath(path));
