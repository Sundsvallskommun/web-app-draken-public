import { Badge, cx } from '@sk-web-gui/react';
import { FC } from 'react';

// Mirrors @casedata/components/errand/ui-phase.component, generalised for an arbitrary
// number of phases: `phase` is a displayName string and the trailing padding is applied
// to the last item via `last` rather than a hardcoded index.
export const SupportUiPhaseComponent: FC<{ number: number; phase: string; active: boolean; last?: boolean }> = ({
  number,
  phase,
  active,
  last,
}) => (
  <div className="flex items-center">
    <span className={cx(last ? `pr-12` : null) + ` flex`}>
      <div className="block ml-18">
        <Badge rounded counter={number} color="vattjom" inverted={!active}></Badge>
      </div>
      <div className={cx(active ? `font-bold` : `font-normal`)}>
        <div className={cx(active ? null : 'hidden md:inline') + ' ml-8'}>{phase}</div>
      </div>
    </span>
  </div>
);
