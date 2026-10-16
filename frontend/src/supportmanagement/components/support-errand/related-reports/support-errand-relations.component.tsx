import { LinkedErrandsDisclosure } from '@common/components/linked-errands-disclosure/linked-errands-disclosure.component';
import { appConfig } from '@config/appconfig';
import { type SupportErrand, supportErrandIsEmpty } from '@supportmanagement/services/support-errand-service';
import { FC } from 'react';

import { RelatedReportsDisclosure } from './related-reports-disclosure.component';

/** The relations module of a support errand: the related reports where the drake uses them, else Kopplade ärenden. */
export const SupportErrandRelations: FC<{ errand: SupportErrand }> = ({ errand }) =>
  appConfig.features.useRelatedReports ? (
    <RelatedReportsDisclosure errand={errand} disabled={supportErrandIsEmpty(errand)} />
  ) : (
    <LinkedErrandsDisclosure errand={errand} />
  );
