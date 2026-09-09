'use client';

import { Badge, cx } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import {
  getSupportUiPhase,
  SUPPORT_UI_PHASE_ORDER,
  supportUiPhaseTranslationKey,
} from '@supportmanagement/services/support-ui-phase-service';
import { FC, Fragment } from 'react';
import { useTranslation } from 'react-i18next';

const SupportUiPhaseStep: FC<{ number: number; label: string; active: boolean; last: boolean }> = ({
  number,
  label,
  active,
  last,
}) => (
  <div className="flex items-center">
    <span className={cx(last ? 'pr-12' : null) + ' flex'}>
      <div className="block ml-18">
        <Badge rounded counter={number} color="vattjom" inverted={!active}></Badge>
      </div>
      <div className={cx(active ? 'font-bold' : 'font-normal')}>
        <div className={cx(active ? null : 'hidden md:inline') + ' ml-8'}>{label}</div>
      </div>
    </span>
  </div>
);

export const SupportUiPhaseWrapper = () => {
  const { t } = useTranslation();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const activePhase = getSupportUiPhase(supportErrand);
  const arrow = <span className="border-t-2 border-r-2 h-[26px] w-[28px] rotate-45"></span>;

  return (
    <div className="flex items-center border-2 rounded-button h-[40px] w-fit">
      {SUPPORT_UI_PHASE_ORDER.map((phase, index) => (
        <Fragment key={phase}>
          {index > 0 ? arrow : null}
          <SupportUiPhaseStep
            number={index + 1}
            label={t(supportUiPhaseTranslationKey(phase))}
            active={phase === activePhase}
            last={index === SUPPORT_UI_PHASE_ORDER.length - 1}
          />
        </Fragment>
      ))}
    </div>
  );
};
