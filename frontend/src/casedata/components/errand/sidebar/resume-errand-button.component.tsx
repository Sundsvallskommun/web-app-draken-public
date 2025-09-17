import { ErrandStatus, pausedStatuses } from '@casedata/interfaces/errand-status';
import { getErrand, setErrandStatus } from '@casedata/services/casedata-errand-service';
import { sortBy } from '@common/services/helper-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useState } from 'react';

export const ResumeErrandButton: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const { municipalityId, errand, setErrand } = useAppContext();
  const confirm = useConfirm();
  const toastMessage = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);

  const showSaveError = () => {
    toastMessage({
      position: 'bottom',
      closeable: false,
      message: 'Något gick fel när ärendet skulle återupptas',
      status: 'error',
    });
    setIsLoading(false);
  };

  const activateErrand = () => {
    setIsLoading(true);
    const previousAcceptedStatus = sortBy(errand.statuses, 'created')
      .reverse()
      .map((s) => s.statusType)
      .find((status) => !pausedStatuses.includes(status));
    const status = Object.values(ErrandStatus).find((status) => status === previousAcceptedStatus);

    if (!status) {
      showSaveError();
      return;
    }

    return setErrandStatus(errand.id, municipalityId, status)
      .then(() => {
        toastMessage(
          getToastOptions({
            message: 'Ärendet återupptogs',
            status: 'success',
          })
        );
        setIsLoading(false);
        getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
      })
      .catch(() => {
        showSaveError();
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
