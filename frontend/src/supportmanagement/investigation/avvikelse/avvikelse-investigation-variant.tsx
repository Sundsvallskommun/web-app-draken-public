'use client';

import { Spinner } from '@sk-web-gui/react';
import dynamic from 'next/dynamic';

import type { InvestigationProfile } from '../investigation-profile';
import type {
  InvestigationCategorizationControlProps,
  InvestigationDetailsHeaderProps,
  InvestigationTabProps,
  InvestigationVariantModule,
} from '../investigation-variant';
import { resolveAvvikelseClassificationPlacement } from './avvikelse-classification-placement';
import { AvvikelseInvestigationNotice } from './avvikelse-investigation-notice.component';

/**
 * Loaded lazily on purpose. A static import would close a module cycle - the registry imports this
 * variant, whose tab renders documents whose classification code asks the registry which variant
 * owns classification. The dynamic import breaks that edge, and splits the tab into its own chunk.
 */
const SupportErrandInvestigationTab = dynamic(
  () => import('./support-errand-investigation-tab').then((module) => module.SupportErrandInvestigationTab),
  {
    loading: () => (
      <div className="flex justify-center p-24">
        <Spinner size={4} aria-label="Utredningen laddas" />
      </div>
    ),
  }
);

/**
 * Lazy for code-splitting only - unlike the tab it closes no cycle. The registry is statically
 * imported by Grundinformation, so anything this module imports statically lands in every drake's
 * bundle whether or not the capability is on.
 */
const AvvikelseCategorizationControl = dynamic(
  () => import('./avvikelse-categorization-control.component').then((module) => module.AvvikelseCategorizationControl),
  { loading: () => null }
);

/** Lazy for the same bundle reason as the categorization control. */
const ErrandLocationCard = dynamic(
  () => import('./assignment/errand-location-card.component').then((module) => module.ErrandLocationCard),
  { loading: () => null }
);

/**
 * The phases the avvikelse process runs through, named as the namespace's phase metadata names them.
 * The documents belong to one phase each: the investigations are written while the errand is being
 * investigated, the decision once it has moved on to being decided. Naming the phases here is what
 * keeps the tabs from being reachable before the errand is there - a namespace whose phase model
 * does not use these names simply runs ungated, as it did before the phases existed.
 */
const INVESTIGATION_PHASE_NAME = 'INVESTIGATION';
const DECISION_PHASE_NAME = 'DECISION';

/**
 * The avvikelse utredning: the Utredning tab and its documents, the avvikelse label tree, and
 * classification owned by the investigation document rather than by Grundinformation. One
 * functional package, enabled by one capability flag.
 *
 * IAF and VOF happen to enable it today. Nothing in this module knows that.
 */
export const avvikelseInvestigationVariant: InvestigationVariantModule = Object.freeze({
  id: 'avvikelse',
  label: 'Utredning',
  enabledBy: 'useAvvikelseInvestigation',
  requiredPhaseName: INVESTIGATION_PHASE_NAME,
  resolveClassificationPlacement: (profile: InvestigationProfile | null | undefined) =>
    resolveAvvikelseClassificationPlacement(profile),
  renderTab: (props: InvestigationTabProps) => <SupportErrandInvestigationTab {...props} />,
  renderNotice: () => <AvvikelseInvestigationNotice />,
  renderCategorizationControl: ({ disabled }: InvestigationCategorizationControlProps) => (
    <AvvikelseCategorizationControl disabled={disabled} />
  ),
  // Ärendets plats: a wrongly routed errand is moved from Ärendeuppgifter, not from inside an investigation.
  renderDetailsHeader: (props: InvestigationDetailsHeaderProps) => <ErrandLocationCard {...props} />,
  /**
   * The decision that closes the investigation: lex Sarah for a reported misconduct, the IVO
   * decision for an HSL deviation. The tab is always offered once the errand is being decided. When
   * there is nothing for this user to decide - the errand calls for no decision, or the decision is
   * another role's - it says only that, and to move on to the follow-up.
   */
  decisionTab: {
    label: 'Beslut',
    requiredPhaseName: DECISION_PHASE_NAME,
    isVisible: () => true,
    render: (props: InvestigationTabProps) => <SupportErrandInvestigationTab {...props} placement="decision" />,
  },
});
