import { useAppContext } from '@contexts/app.context';
import { useConfirm, useSnackbar, Button } from '@sk-web-gui/react';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  getSupportErrandById,
  setSupportErrandStatus,
  Status,
} from '@supportmanagement/services/support-errand-service';
import { useState } from 'react';

export const ResumeErrand: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const { municipalityId, supportErrand, setSupportErrand } = useAppContext();
  const confirm = useConfirm();
  const toastMessage = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);

  const activateErrand = () => {
    setIsLoading(true);
    return setSupportErrandStatus(supportErrand.id, municipalityId, Status.ONGOING)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärende återupptogs',
          status: 'success',
        });
        return getSupportErrandById(supportErrand.id, municipalityId).then((res) => {
          setSupportErrand(res.errand);
          setIsLoading(false);
        });
      })
      .catch(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när ärendet återupptogs',
          status: 'error',
        });
        setIsLoading(false);
      });
  };

  if (![Status.PENDING, Status.AWAITING_INTERNAL_RESPONSE].includes(supportErrand?.status as Status)) {
    return null;
  }

  return (
    <Button
      className="w-full"
      color="vattjom"
      data-cy="resume-button"
      leftIcon={<LucideIcon name="circle-play" />}
      variant="secondary"
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
