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
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import {
  getActiveSupportPhaseId,
  getSupportPhases,
  isInitialSupportPhase,
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
  const setSupportMetadata = useMetadataStore((s) => s.setSupportMetadata);
  const { handleSubmit, reset } = useFormContext();
  const cachedPhases = useMemo(() => getSupportPhases(supportMetadata?.phases), [supportMetadata?.phases]);

  /**
   * The workflow, read fresh rather than from the cached metadata.
   *
   * The metadata store is persisted in the browser and only refetched every half hour, so a session
   * opened before the namespace configured its phases keeps a copy that has none - and a copy with
   * no phases reads exactly like a deployment running no workflow: nothing to move the errand out
   * of, and no phase to say which statuses it allows. That is the difference between moving the
   * errand on and asking Support Management for a status the phase forbids, so this write asks for
   * the current answer. A failed read falls back to what is cached rather than blocking the start.
   */
  const readPhases = async () => {
    try {
      const { metadata, error } = await getSupportMetadata(municipalityId);
      if (error || !metadata) return cachedPhases;
      setSupportMetadata(metadata);
      return getSupportPhases(metadata.phases);
    } catch {
      return cachedPhases;
    }
  };

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
      // Taking the errand on is the same event as leaving the phase it was registered in, so the
      // button moves it there. Two moves at most, because an errand that never entered the workflow
      // needs both: entering lands it in the registered phase, which is where it should have been
      // all along, so the same press continues out of it. Once the errand is past that phase,
      // moving on is the handler's choice and this button makes none.
      const phases = await readPhases();
      let started = afterAssignment.errand;
      for (let move = 0; move < 2; move += 1) {
        const activePhaseId = getActiveSupportPhaseId(started.phases);
        if (activePhaseId && !isInitialSupportPhase(activePhaseId, phases)) break;

        const advance = resolveStartProcessPhaseAdvance(activePhaseId, phases);
        if (!advance) break;

        const expectedVersion = typeof started.version === 'number' ? started.version : undefined;
        if (expectedVersion === undefined) break;

        started = await updateSupportErrandPhase(
          municipalityId,
          supportErrand!.id!,
          advance.kind === 'transition' ? advance.transitionId : undefined,
          expectedVersion
        );
      }

      // Where a workflow is configured the status is the phase's to decide - each phase declares the
      // statuses it allows, and Support Management sets the one that belongs to the phase the errand
      // moves into. Writing an ongoing status on top of that is at best a no-op and at worst refused,
      // since the status this application calls "ongoing" belongs to a phase further along. Only a
      // deployment running no workflow has nothing to set it, and there the button still does.
      const startedPhaseId = getActiveSupportPhaseId(started.phases);
      if (
        phases.length === 0 &&
        started.status !== getOngoingStatus() &&
        isStatusAllowedInPhase(getOngoingStatus(), startedPhaseId, phases)
      ) {
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
      // Part of the flow may have landed - the assignment in particular - and every later write is
      // conditioned on the version those produced. Reloading leaves the user on a current errand, so
      // the next attempt, here or from the phase strip, is not refused over a stale version.
      const current = await getSupportErrandById(supportErrand!.id!, municipalityId);
      if (!current.error) {
        setSupportErrand(current.errand);
        reset(current.errand);
      }
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
