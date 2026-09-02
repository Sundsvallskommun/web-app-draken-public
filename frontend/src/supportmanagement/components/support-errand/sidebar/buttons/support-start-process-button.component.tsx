import { Button, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import {
  getSupportErrandById,
  setSupportErrandAdmin,
  setSupportErrandStatus,
  Status,
} from '@supportmanagement/services/support-errand-service';
import { supportErrandWriteErrorMessage } from '@supportmanagement/services/support-errand-write-version';
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
            afterSubmit.errand.version,
            assignmentStatus,
            currentAdmin.adAccount
          );
          statusTransitionHandledByAssignment = assignmentStatus !== undefined;
        }
      }

      // Only reached when the assignment above did not run, so `afterSubmit` is still the
      // version this flow last produced.
      if (!statusTransitionHandledByAssignment && afterSubmit.errand.status !== Status.ONGOING) {
        await setSupportErrandStatus(supportErrand!.id!, municipalityId, Status.ONGOING, afterSubmit.errand);
      }

      const updated = await getSupportErrandById(supportErrand!.id!, municipalityId);
      setSupportErrand(updated.errand);
      reset(updated.errand);

      toast({ message: 'Handläggning startad', status: 'success', position: 'bottom' });
    } catch (err) {
      console.error(err);
      toast({
        message: supportErrandWriteErrorMessage(err, 'Något gick fel vid start av handläggning'),
        status: 'error',
        position: 'bottom',
      });
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
