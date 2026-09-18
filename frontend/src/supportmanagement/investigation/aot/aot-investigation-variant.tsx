'use client';

import { defaultBasicsPlacement } from '../classification-placement';
import type { InvestigationVariantModule } from '../investigation-variant';
// Statically imported, unlike avvikelse's tab. That one is lazy because a static import closes a
// module cycle; this placeholder reaches nothing and is a few lines, so next/dynamic would buy no
// code-splitting worth having and would add a loading frame for tests to race.
import { AotInvestigationTab } from './aot-investigation-tab.component';

/**
 * The AOT utredning: a tab, and nothing else yet.
 *
 * It supplies only the required slots. No `renderNotice`, no `renderCategorizationControl`, and a
 * placement with no `labelTree` - so Grundinformation keeps the ordinary two-/three-level
 * categorization control that every drake outside IAF/VOF uses, and no classification policy is
 * consulted at all.
 *
 * That this module needs nothing from `avvikelse/` is the point: the two implementations share the
 * contract and no code.
 */
export const aotInvestigationVariant: InvestigationVariantModule = Object.freeze({
  id: 'aot',
  label: 'Utredning',
  enabledBy: 'useAotInvestigation',
  resolveClassificationPlacement: () => defaultBasicsPlacement,
  renderTab: () => <AotInvestigationTab />,
});
