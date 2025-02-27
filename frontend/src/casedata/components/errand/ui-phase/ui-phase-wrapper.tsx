import { UiPhase } from '@casedata/interfaces/errand-phase';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { useAppContext } from '@common/contexts/app.context';
import { UiPhaseComponent } from '../ui-phase.component';

export const UiPhaseWrapper = () => {
  const { errand, uiPhase } = useAppContext();
  const arrow = <span className="border-t-2 border-r-2 h-[26px] w-[28px] rotate-45"></span>;

  return (
    <div className="flex items-center border-2 rounded-button h-[40px] w-fit">
      <UiPhaseComponent number={1} phase={UiPhase.registrerad} active={uiPhase === UiPhase.registrerad} />
      {arrow}
      <UiPhaseComponent number={2} phase={UiPhase.granskning} active={uiPhase === UiPhase.granskning} />
      {arrow}
      <UiPhaseComponent number={3} phase={UiPhase.utredning} active={uiPhase === UiPhase.utredning} />
      {arrow}
      <UiPhaseComponent number={4} phase={UiPhase.beslut} active={uiPhase === UiPhase.beslut} />
      {arrow}
      <UiPhaseComponent
        number={5}
        phase={UiPhase.slutfor}
        active={uiPhase === UiPhase.slutfor && errand.status.statusType !== ErrandStatus.ArendeAvslutat}
      />
    </div>
  );
};
