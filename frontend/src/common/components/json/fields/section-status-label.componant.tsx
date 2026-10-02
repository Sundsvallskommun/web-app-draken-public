import { Label } from '@sk-web-gui/react';
import { FC } from 'react';

export type SectionStatus = 'error' | 'complete';

export const SectionStatusLabel: FC<{ status: SectionStatus; 'data-cy'?: string }> = ({
  status,
  'data-cy': dataCy,
}) => (
  <Label
    inverted
    rounded
    color={status === 'error' ? 'error' : 'gronsta'}
    className="sk-disclosure-label whitespace-nowrap"
    data-cy={dataCy}
  >
    {status === 'error' ? 'Ej komplett' : 'Komplett'}
  </Label>
);
