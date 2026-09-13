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

export const isDragonId = (value: string): value is DragonId => (DRAGON_IDS as readonly string[]).includes(value);
