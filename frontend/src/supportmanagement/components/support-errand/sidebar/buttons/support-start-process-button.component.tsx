import { Button, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import {
  getSupportErrandById,
  setSupportErrandAdmin,
  setSupportErrandStatus,
  Status,
} from '@supportmanagement/services/support-errand-service';
import { ArrowRight } from 'lucide-react';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

export const SupportStartProcessButtonComponent: FC<{
  disabled: boolean;
  onSubmit: () => Promise<any>;
  onError: () => void;
}> = ({ disabled, onSubmit, onError }) => {
  const user = useUserStore((s) => s.user);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const administrators = useUserStore((s) => s.administrators);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const toast = useSnackbar();
  const { handleSubmit, reset } = useFormContext();

  const handleStartProcess = async () => {
    try {
      await onSubmit();

      const afterSubmit = await getSupportErrandById(supportErrand!.id!, municipalityId);
      if (afterSubmit.error) {
        throw new Error('Could not reload the support errand before starting it');
      }

      let statusTransitionHandledByAssignment = false;
      if (!afterSubmit.errand.assignedUserId) {
        const currentAdmin = administrators.find((a) => a.adAccount === user.username);
        if (currentAdmin) {
          const assignmentStatus = afterSubmit.errand.status === Status.ONGOING ? undefined : Status.ONGOING;
          await setSupportErrandAdmin(
            supportErrand!.id!,
            municipalityId,
            currentAdmin.adAccount,
            assignmentStatus,
            currentAdmin.adAccount
          );
          statusTransitionHandledByAssignment = assignmentStatus !== undefined;
        }
      }

      if (!statusTransitionHandledByAssignment && afterSubmit.errand.status !== Status.ONGOING) {
        await setSupportErrandStatus(supportErrand!.id!, municipalityId, Status.ONGOING);
      }

      const updated = await getSupportErrandById(supportErrand!.id!, municipalityId);
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
      rightIcon={<ArrowRight size={18} />}
    >
      Starta handläggning
    </Button>
  );
};
