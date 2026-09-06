'use client';

import { Spinner } from '@sk-web-gui/react';
import dynamic from 'next/dynamic';

import type { InvestigationProfile } from '../supportmanagement/investigation/investigation-profile';
import type {
  InvestigationCategorizationControlProps,
  InvestigationTabProps,
  InvestigationVariantModule,
} from '../supportmanagement/investigation/investigation-variant';
import { resolveAvvikelseClassificationPlacement } from './avvikelse-classification-placement';
import { AvvikelseInvestigationNotice } from './avvikelse-investigation-notice.component';

/** Load the document UI on demand in applications that compose Avvikelse. */
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

/** Classification controls have their own chunk within Avvikelse. */
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
});
