import { Button, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  getOngoingStatus,
  getSupportErrandById,
  setSupportErrandAdmin,
  setSupportErrandStatus,
  Status,
  updateSupportErrandPhase,
} from '@supportmanagement/services/support-errand-service';
import {
  SupportErrandStatusAfterAssignmentError,
  supportErrandWriteErrorMessage,
} from '@supportmanagement/services/support-errand-write-version';
import {
  getActiveSupportPhaseId,
  getSupportPhases,
  isStatusAllowedInPhase,
  resolveStartProcessPhaseAdvance,
} from '@supportmanagement/services/support-phase-service';
import { ArrowRight } from 'lucide-react';
import { FC, useMemo } from 'react';
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
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const toast = useSnackbar();
  const { handleSubmit, reset } = useFormContext();
  const phases = useMemo(() => getSupportPhases(supportMetadata?.phases), [supportMetadata?.phases]);

  const handleStartProcess = async () => {
    try {
      await onSubmit();

      const afterSubmit = await getSupportErrandById(supportErrand!.id!, municipalityId);
      if (afterSubmit.error) {
        throw new Error('Could not reload the support errand before starting it');
      }

      let assigned = false;
      if (!afterSubmit.errand.assignedUserId) {
        const currentAdmin = administrators.find((a) => a.adAccount === user.username);
        if (currentAdmin) {
          // Assignment only: the status is left to the steps below, because it is the phase that
          // declares which statuses the errand may have, and the phase an errand is registered in
          // allows nothing but Ny.
          await setSupportErrandAdmin(
            supportErrand!.id!,
            municipalityId,
            currentAdmin.adAccount,
            afterSubmit.errand.version,
            undefined,
            currentAdmin.adAccount
          );
          assigned = true;
        }
      }

      const afterAssignment = assigned
        ? await getSupportErrandById(supportErrand!.id!, municipalityId)
        : { errand: afterSubmit.errand, error: undefined as string | undefined };
      if (afterAssignment.error) {
        throw new Error('Could not reload the support errand after assigning it');
      }

      // Taking the errand on is also leaving the phase it was registered in, so the same button
      // moves it - and it has to move first. A phase declares which statuses it allows, and the
      // registered phase allows only Ny, so the status cannot be set until the errand has left it.
      // A workflow with no single next phase is left to the phase strip, which names the branches.
      const advance = resolveStartProcessPhaseAdvance(getActiveSupportPhaseId(afterAssignment.errand.phases), phases);
      const moved =
        advance && typeof afterAssignment.errand.version === 'number'
          ? await updateSupportErrandPhase(
              municipalityId,
              supportErrand!.id!,
              advance.kind === 'transition' ? advance.transitionId : undefined,
              afterAssignment.errand.version
            )
          : undefined;

      // The phase it arrived in may already have put the errand in the status that phase wants, and
      // it is the phase that says which statuses are available at all - so the ongoing status is
      // written only where the errand is not already there and the phase allows it. A failure here
      // leaves the errand assigned but lying in Ny, which is what the message for that half-finished
      // state says.
      const started = moved ?? afterAssignment.errand;
      const startedPhaseId = getActiveSupportPhaseId(started.phases);
      if (started.status !== getOngoingStatus() && isStatusAllowedInPhase(getOngoingStatus(), startedPhaseId, phases)) {
        try {
          await setSupportErrandStatus(supportErrand!.id!, municipalityId, getOngoingStatus(), started);
        } catch (statusError) {
          throw assigned ? new SupportErrandStatusAfterAssignmentError(statusError) : statusError;
        }
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
