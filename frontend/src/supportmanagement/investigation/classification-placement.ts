import type { SupportErrandClassificationPlacement } from './iaf-vof-investigation-classification-policy';

/**
 * The placement every application resolves to when no investigation variant claims it:
 * Grundinformation owns classification and renders the ordinary categorization control.
 *
 * It lives outside the IAF/VOF policy module so the runtime adapter can return it without
 * reaching into that policy. The type is still declared there and imported type-only, which
 * erases at build time - the union's variant-specific members move out with the module itself.
 */
export const defaultBasicsPlacement: SupportErrandClassificationPlacement = Object.freeze({
  owner: 'basics',
  categorization: 'default',
});
