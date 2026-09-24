import { appConfig } from '@config/appconfig';
import { Button, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import {
  getSupportErrandById,
  setSupportErrandAdmin,
  setSupportErrandStatus,
  Status,
} from '@supportmanagement/services/support-errand-service';
import {
  getSupportErrandProcess,
  sendSupportProcessSignal,
  supportProcessAwaitingSignals,
  SupportProcessStep,
  supportProcessStepName,
} from '@supportmanagement/services/support-process-service';
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

  /**
   * Starting the handling is what completes the registration, so the process is stepped with it. An
   * errand in another step, and one without a process, is left alone - and a signal that fails does
   * not undo the handling that has started.
   */
  const stepPastRegistration = async () => {
    if (!appConfig.features.useProcess) return;
    const process = getSupportErrandProcess(supportErrand);
    if (supportProcessStepName(process) !== SupportProcessStep.REGISTRATION) return;
    const signal = supportProcessAwaitingSignals(process)[0];
    if (!signal?.name) return;
    await sendSupportProcessSignal(supportErrand!.id!, municipalityId, signal.name).catch((e) => {
      console.error('Failed to step the process past the registration', e);
    });
  };

  const handleStartProcess = async () => {
    try {
      await onSubmit();

      if (!supportErrand!.assignedUserId) {
        const currentAdmin = administrators.find((a) => a.adAccount === user.username);
        if (currentAdmin) {
          await setSupportErrandAdmin(
            supportErrand!.id!,
            municipalityId,
            currentAdmin.adAccount,
            Status.ONGOING,
            currentAdmin.adAccount
          );
        }
      }

      await setSupportErrandStatus(supportErrand!.id!, municipalityId, Status.ONGOING);
      await stepPastRegistration();

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
