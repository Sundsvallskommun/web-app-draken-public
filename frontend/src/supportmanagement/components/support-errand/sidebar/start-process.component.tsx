import { useAppContext } from '@contexts/app.context';
import { Button, useSnackbar } from '@sk-web-gui/react';
import {
  Status,
  setSupportErrandStatus,
  setSupportErrandAdmin,
  getSupportErrandById,
} from '@supportmanagement/services/support-errand-service';
import { useFormContext } from 'react-hook-form';

export const StartProcessComponent: React.FC<{
  disabled: boolean;
  onSubmit: () => Promise<any>;
  onError: () => void;
}> = ({ disabled, onSubmit, onError }) => {
  const { user, supportErrand, administrators, municipalityId, setSupportErrand } = useAppContext();
  const toast = useSnackbar();
  const { handleSubmit, reset } = useFormContext();

  const handleStartProcess = async () => {
    try {
      await onSubmit();

      if (!supportErrand.assignedUserId) {
        const currentAdmin = administrators.find((a) => a.adAccount === user.username);
        if (currentAdmin) {
          await setSupportErrandAdmin(
            supportErrand.id,
            municipalityId,
            currentAdmin.adAccount,
            Status.ONGOING,
            currentAdmin.adAccount
          );
        }
      }

      await setSupportErrandStatus(supportErrand.id, municipalityId, Status.ONGOING);

      const updated = await getSupportErrandById(supportErrand.id, municipalityId);
      setSupportErrand(updated.errand);
      reset(updated.errand);

      toast({ message: 'Handläggning startad', status: 'success', position: 'bottom' });
    } catch (err) {
      console.error(err);
      toast({ message: 'Något gick fel vid start av handläggning', status: 'error', position: 'bottom' });
    }
  };

  if (!supportErrand || supportErrand.status !== Status.NEW) {
    return null;
  }

  return (
    <Button
      className="w-full"
      type="button"
      disabled={disabled}
      onClick={handleSubmit(handleStartProcess, onError)}
      variant="primary"
      color="vattjom"
    >
      Starta handläggning
    </Button>
  );
};
