'use client';

import { Spinner } from '@sk-web-gui/react';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import dynamic from 'next/dynamic';

import type { InvestigationAccessState } from '../investigation-access';
import type { InvestigationProfile } from '../investigation-profile';
import type {
  InvestigationCategorizationControlProps,
  InvestigationTabProps,
  InvestigationVariantModule,
} from '../investigation-variant';
import { resolveAvvikelseClassificationPlacement } from './avvikelse-classification-placement';
import { isAvvikelseReportedMisconductErrand } from './avvikelse-classification-policy';
import { AvvikelseInvestigationNotice } from './avvikelse-investigation-notice.component';
import { visibleInvestigationDocuments } from './investigation-tab-state';

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
  resolveClassificationPlacement: (profile: InvestigationProfile | null | undefined) =>
    resolveAvvikelseClassificationPlacement(profile),
  renderTab: (props: InvestigationTabProps) => <SupportErrandInvestigationTab {...props} />,
  renderNotice: () => <AvvikelseInvestigationNotice />,
  renderCategorizationControl: ({ disabled }: InvestigationCategorizationControlProps) => (
    <AvvikelseCategorizationControl disabled={disabled} />
  ),
  /**
   * The lex Sarah decision. Offered only on a reported misconduct errand, and only when the
   * profile has a decision document this user reaches: a handler who is not mapped to the decision
   * gets no tab rather than a tab that explains it is not theirs.
   */
  decisionTab: {
    label: 'Beslut',
    isVisible: (
      errand: SupportErrand | undefined,
      profile: InvestigationProfile | null | undefined,
      access: InvestigationAccessState
    ) =>
      isAvvikelseReportedMisconductErrand(errand ?? {}) &&
      visibleInvestigationDocuments(profile, { placement: 'decision', reportedMisconduct: true, access }).length > 0,
    render: (props: InvestigationTabProps) => <SupportErrandInvestigationTab {...props} placement="decision" />,
  },
});
