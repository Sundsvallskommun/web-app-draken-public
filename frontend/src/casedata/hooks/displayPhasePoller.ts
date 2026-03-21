import { IErrand } from '@casedata/interfaces/errand';
import { UiPhase } from '@casedata/interfaces/errand-phase';
import { getErrand } from '@casedata/services/casedata-errand-service';
import { useCasedataStore, useConfigStore } from '@stores/index';

function useDisplayPhasePoller() {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errand = useCasedataStore((s) => s.errand);
  const setErrand = useCasedataStore((s) => s.setErrand);
  const pollDisplayPhase = () => {
    if (!errand) return;
    let displayPhase = errand.extraParameters.find((p) => p.key === 'process.displayPhase')?.values?.[0] as UiPhase;
    const displayPhasePoll = setInterval(() => {
      if (displayPhase !== UiPhase.registrerad) {
        clearInterval(displayPhasePoll);
      } else {
        getErrand(municipalityId, errand.id.toString()).then((res) => {
          setErrand(res.errand);
          displayPhase = res.errand?.extraParameters.find((p) => p.key === 'process.displayPhase')
            ?.values?.[0] as UiPhase;
        });
      }
    }, 1000);
  };

  return {
    pollDisplayPhase,
  };
}

export default useDisplayPhasePoller;
