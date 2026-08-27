'use client';

import { getApplication } from '@common/services/application-service';
import { Spinner } from '@sk-web-gui/react';
import dynamic from 'next/dynamic';

import { resolveSupportErrandClassificationPlacement } from '../iaf-vof-investigation-classification-policy';
import type { InvestigationProfile } from '../investigation-profile';
import type { InvestigationTabProps, InvestigationVariantModule } from '../investigation-variant';
import { AvvikelseInvestigationNotice } from './avvikelse-investigation-notice.component';

/**
 * Loaded lazily on purpose. A static import would close a module cycle - the registry imports this
 * variant, whose tab renders documents whose classification code asks the registry which variant
 * owns classification. The dynamic import breaks that edge, and splits the tab into its own chunk.
 */
const SupportErrandInvestigationTab = dynamic(
  () => import('../support-errand-investigation-tab').then((module) => module.SupportErrandInvestigationTab),
  {
    loading: () => (
      <div className="flex justify-center p-24">
        <Spinner size={4} aria-label="Utredningen laddas" />
      </div>
    ),
  }
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
    // getApplication() is passed only so the resolver can verify the profile it was handed belongs
    // to this deployment. It selects no functionality - the capability flag already did that.
    resolveSupportErrandClassificationPlacement({ application: getApplication(), profile }),
  renderTab: (props: InvestigationTabProps) => <SupportErrandInvestigationTab {...props} />,
  renderNotice: () => <AvvikelseInvestigationNotice />,
});
