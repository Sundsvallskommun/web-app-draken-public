import { UiPhase } from '@casedata/interfaces/errand-phase';
import { Badge, cx } from '@sk-web-gui/react';

export const UiPhaseComponent: React.FC<{ number: number; phase: UiPhase; active: boolean }> = ({
  number,
  phase,
  active,
}) => (
  <div className="flex items-center">
    <span className={cx(number === 5 ? `pr-12` : null) + ` flex`}>
      <div className="block ml-18">
        <Badge rounded counter={number} color="vattjom" inverted={!active}></Badge>
      </div>
      <div className={cx(active ? `font-bold` : `font-normal`)}>
        <div className={cx(active ? null : 'hidden md:inline') + ' ml-8'}>{phase}</div>
      </div>
    </span>
  </div>
);
