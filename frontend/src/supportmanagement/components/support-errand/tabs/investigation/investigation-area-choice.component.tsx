'use client';

import { FormControl, FormLabel, RadioButton } from '@sk-web-gui/react';
import { InvestigationArea, type InvestigationAreaName } from '@supportmanagement/investigations';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

const AREA_KEYS: Record<InvestigationAreaName, string> = {
  ALCOHOL: 'common:investigation.areas.alcohol',
  TOBACCO: 'common:investigation.areas.tobacco',
};

/**
 * Which trade the errand is about. It is preselected from the errand's own labels, but a tillsyn registered by
 * hand carries none, so the handler can always say. The choice decides the legal basis and the statements offered.
 */
export const InvestigationAreaChoice: FC<{
  area: InvestigationAreaName | undefined;
  readOnly: boolean;
  busy: boolean;
  onChoose: (area: InvestigationAreaName) => void;
}> = ({ area, readOnly, busy, onChoose }) => {
  const { t } = useTranslation();

  return (
    <FormControl id="investigation-area" className="relative">
      <FormLabel>{t('common:investigation.areas.label')}</FormLabel>
      <RadioButton.Group inline data-cy="investigation-area">
        {Object.values(InvestigationArea).map((candidate) => (
          <RadioButton
            key={candidate}
            name="investigation-area"
            id={`investigation-area-${candidate}`}
            value={candidate}
            checked={area === candidate}
            disabled={readOnly || busy}
            data-cy={`investigation-area-${candidate}`}
            onChange={() => onChoose(candidate)}
          >
            {t(AREA_KEYS[candidate])}
          </RadioButton>
        ))}
      </RadioButton.Group>
      {area ? null : (
        <span className="text-small text-error" data-cy="investigation-area-missing">
          {t('common:investigation.areas.missing')}
        </span>
      )}
    </FormControl>
  );
};
