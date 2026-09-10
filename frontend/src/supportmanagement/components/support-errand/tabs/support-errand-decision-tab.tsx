import { useTranslation } from 'react-i18next';

import { PhaseTabPlaceholder } from './support-errand-phase-tab-placeholder';

const PLANNED_CONTENT = [
  'Beslutsunderlag hämtat ur ansökan och utredningen',
  'Beslutsfattare enligt delegationsordning: handläggare, utskott, nämndsordförande eller nämnd',
  'Utfall för ansökan: bifall, bifall med villkor eller avslag',
  'Utfall för anmälan: registrera eller förelägg om komplettering',
  'Beslutsbevis, och tillståndet som skapas i tillståndsregistret',
];

export const SupportErrandDecisionTab: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PhaseTabPlaceholder
      heading={t('common:tabs.decision')}
      intro="Fliken är ännu inte byggd. Innehållet nedan kommer från verksamhetens skiss och är det som ska landa här."
      planned={PLANNED_CONTENT}
    />
  );
};
