import { appConfig } from '@config/appconfig';
import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  getSupportErrandById,
  setSupportErrandStatus,
  Status,
} from '@supportmanagement/services/support-errand-service';
import dayjs from 'dayjs';
import { Undo2 } from 'lucide-react';
import { useState } from 'react';

export const SupportReopenErrandButton: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const confirm = useConfirm();
  const toastMessage = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);

  const hasClosedErrandPassedLimit = () => {
    const limit = appConfig.reopenSupportErrandLimit;
    const lastModified = dayjs(supportErrand?.modified);
    return dayjs().isAfter(lastModified.add(parseInt(limit), 'day'));
  };

  const reopenErrand = () => {
    setIsLoading(true);
    return setSupportErrandStatus(supportErrand!.id!, municipalityId, Status.ONGOING)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärendet återöppnades',
          status: 'success',
        });
        return getSupportErrandById(supportErrand!.id!, municipalityId).then((res) => {
          setSupportErrand(res.errand);
          setIsLoading(false);
        });
      })
      .catch(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när ärendet återöppnades',
          status: 'error',
        });
        setIsLoading(false);
      });
  };

  return (
    <Button
      className="w-full mt-20"
      color="vattjom"
      leftIcon={<Undo2 />}
      variant="secondary"
      disabled={disabled || (supportErrand?.status !== Status.REOPENED && hasClosedErrandPassedLimit())}
      loading={isLoading}
      loadingText="Återöppnar"
      onClick={() => {
        confirm
          .showConfirmation('Återöppna ärende', 'Vill du återöppna ärendet?', 'Ja', 'Nej', 'info', 'info')
          .then((confirmed) => {
            if (confirmed) {
              reopenErrand();
            }
          });
      }}
    >
      Återöppna ärende
    </Button>
  );
};
