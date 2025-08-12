import { useAppContext } from '@contexts/app.context';
import { useConfirm, useSnackbar, Button } from '@sk-web-gui/react';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { useState } from 'react';
import { sortBy } from '@common/services/helper-service';
import { getErrand, setErrandStatus } from '@casedata/services/casedata-errand-service';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { getToastOptions } from '@common/utils/toast-message-settings';

export const ResumeErrandButton: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const { municipalityId, errand, setErrand } = useAppContext();
  const confirm = useConfirm();
  const toastMessage = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);

  const activateErrand = () => {
    setIsLoading(true);
    const previousStatus = sortBy(errand.statuses, 'created').reverse()[1].statusType;
    return setErrandStatus(
      errand.id,
      municipalityId,
      Object.values(ErrandStatus).find((status) => status === previousStatus),
      null,
      null
    )
      .then((res) => {
        toastMessage(
          getToastOptions({
            message: 'Ärendet återupptogs',
            status: 'success',
          })
        );
        setIsLoading(false);
        getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när ärendet skulle återupptas',
          status: 'error',
        });
        setIsLoading(false);
      });
  };

  return (
    <Button
      className="w-full"
      color="vattjom"
      data-cy="resume-button"
      leftIcon={<LucideIcon name="circle-play" />}
      variant={'primary'}
      disabled={disabled}
      loading={isLoading}
      loadingText="Återupptar"
      onClick={() => {
        confirm
          .showConfirmation('Återuppta ärende', 'Vill du återuppta ärendet?', 'Ja', 'Nej', 'info', 'info')
          .then((confirmed) => {
            if (confirmed) {
              activateErrand();
            }
          });
      }}
    >
      Återuppta ärende
    </Button>
  );
};
