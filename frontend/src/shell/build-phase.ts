/**
 * `next build` for the Docker image runs with every `NEXT_PUBLIC_*` variable set to a placeholder
 * (`.env-cicd`, copied to `.env.local` by the Dockerfile); `entrypoint.sh` substitutes the real
 * values when the container starts. During that build the identity is `NEXT_PUBLIC_APPLICATION_PLACEHOLDER`,
 * not a dragon, and nothing may be composed: the route modules are evaluated only to collect
 * metadata and to prerender the static not-found page, neither of which reads a policy.
 *
 * Next.js marks the phase with `NEXT_PHASE`. At runtime (dev server, `next start`, the container)
 * it is unset, and an unknown identity is the startup error it should be.
 */
export const PRODUCTION_BUILD_PHASE = 'phase-production-build';

export const isProductionBuildPhase = (phase: string | undefined): boolean => phase === PRODUCTION_BUILD_PHASE;
