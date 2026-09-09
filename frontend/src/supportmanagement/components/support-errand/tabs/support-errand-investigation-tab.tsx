import { useTranslation } from 'react-i18next';

import { PhaseTabPlaceholder } from './support-errand-phase-tab-placeholder';

const PLANNED_CONTENT = [
  'Remisser och yttranden till Polismyndigheten, Skatteverket, Kronofogden, Räddningstjänsten, Miljökontoret och Syna, med status per yttrande',
  'Vandelsprövning per person med betydande inflytande',
  'Kunskapsprov med status och bokning',
  'Utredningens förslag till beslut: tillstyrker, tillstyrker med villkor, ingen erinran eller avstyrker',
];

export const SupportErrandInvestigationTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PhaseTabPlaceholder
      heading={t('common:tabs.investigation')}
      intro="Fliken är ännu inte byggd. Innehållet nedan kommer från verksamhetens skiss och är det som ska landa här."
      planned={PLANNED_CONTENT}
    />
  );
};
