import { DRAGON_IDS, type DragonId } from '@dragons/dragon-module';

/**
 * The one read of which dragon this process is. Everything else in the shell takes the identity
 * as an argument; domains and core never see it at all.
 *
 * `String()` matters: entrypoint.sh replaces `NEXT_PUBLIC_*` placeholders in the built bundle when
 * the container starts, so the value must survive the build as a runtime expression rather than
 * being constant-folded into a literal (the same trick `application-service.ts` uses).
 */
export const APP_IDENTITY: string = String(process.env.NEXT_PUBLIC_APPLICATION || '');
// next.config.js injects this as a fixed build value; entrypoint.sh never replaces it.
export const BUILT_DRAGON_ID: string = process.env.DRAKEN_BUILD_DRAGON || '';
export const BUILT_REVISION: string = process.env.DRAKEN_BUILD_REVISION || '';
// Local dev and local production E2E builds have no reviewed deployment manifest. Images require
// a manifest hash in their entrypoint before this runtime placeholder is substituted.
export const DEPLOYMENT_ID: string = String(process.env.NEXT_PUBLIC_DEPLOYMENT_ID || 'development');

export const isDragonId = (value: string): value is DragonId => (DRAGON_IDS as readonly string[]).includes(value);
