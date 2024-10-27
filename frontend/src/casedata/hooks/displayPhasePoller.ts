import { IErrand } from '@casedata/interfaces/errand';
import { UiPhase } from '@casedata/interfaces/errand-phase';
import { getErrand } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@contexts/app.context';

function useDisplayPhasePoller() {
  const { municipalityId, errand, setErrand }: { municipalityId: string; errand: IErrand; setErrand: any } =
    useAppContext();
  const pollDisplayPhase = () => {
    let displayPhase = errand.extraParameters['process.displayPhase'] as UiPhase;
    const displayPhasePoll = setInterval(() => {
      if (displayPhase !== UiPhase.registrerad) {
        clearInterval(displayPhasePoll);
      } else {
        getErrand(municipalityId, errand.id.toString()).then((res) => {
          setErrand(res.errand);
          displayPhase = res.errand.extraParameters['process.displayPhase'];
        });
      }
    }, 1000);
  };

  return {
    pollDisplayPhase,
  };
}

export default useDisplayPhasePoller;
