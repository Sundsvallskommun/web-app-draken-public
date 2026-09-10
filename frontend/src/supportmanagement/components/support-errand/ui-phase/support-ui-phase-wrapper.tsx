'use client';

import { Badge, cx, Icon } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import {
  getSupportUiPhase,
  SUPPORT_UI_PHASE_ORDER,
  supportUiPhaseTranslationKey,
} from '@supportmanagement/services/support-ui-phase-service';
import { ArrowRight } from 'lucide-react';
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
      <div className="block ml-12">
        <Badge rounded={active} counter={number} color="vattjom" inverted={active}></Badge>
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
  const arrow = (
    <div className="flex pl-12">
      <Icon icon={<ArrowRight />} size="1.5rem" />
    </div>
  );

  return (
    <div className="flex items-center rounded-xl border-1 h-[40px] w-fit">
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
