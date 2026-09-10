import { useTranslation } from 'react-i18next';

import { PhaseTabPlaceholder } from './support-errand-phase-tab-placeholder';

const PLANNED_CONTENT = [
  'Tillståndets status och giltighet',
  'Tillsyn av att villkoren fortsatt uppfylls',
  'Fakturering',
  'Ärenden som skapats från det här ärendet, och ärenden det skapats ur',
];

export const SupportErrandFollowUpTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PhaseTabPlaceholder
      heading={t('common:tabs.followup')}
      intro="Fliken är ännu inte byggd. Innehållet nedan kommer från verksamhetens skiss och är det som ska landa här."
      planned={PLANNED_CONTENT}
    />
  );
};
