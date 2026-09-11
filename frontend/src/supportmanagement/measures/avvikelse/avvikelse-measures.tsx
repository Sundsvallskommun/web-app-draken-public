import { Modal, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useUserStore } from '@stores/user-store';
import { isSupportErrandLocked, type SupportErrand } from '@supportmanagement/services/support-errand-service';
import { isSupportErrandWriteConflict } from '@supportmanagement/services/support-errand-write-version';
import { useCallback, useId, useRef, useState } from 'react';

import { MeasureActionPlanButton } from '../measure-action-plan-button';
import { measureCanBeDecided, type MeasureDecisionInput } from '../measure-decision';
import { MeasureFilterBar } from '../measure-filter-bar';
import { emptyMeasureFilters, filterMeasures, isMeasureFilterActive, measureFilterOptions } from '../measure-filters';
import {
  measureBelongsInFollowUp,
  measureCanBeFollowedUp,
  type MeasureFollowUpInput,
  type SupportMeasure,
} from '../measure-follow-up';
import { MeasureList } from '../measure-list';
import { measureTypeLabel } from '../measure-types';
import {
  createSupportMeasure,
  decideSupportMeasure,
  followUpSupportMeasure,
  type MeasuresSnapshot,
  updateSupportMeasure,
} from '../support-measure-service';
import { AvvikelseMeasureDecisionDialog } from './avvikelse-measure-decision-dialog';
import { AvvikelseMeasureFollowUpDialog } from './avvikelse-measure-follow-up-dialog';
import { AvvikelseMeasureForm, confirmDiscardMeasureDraft } from './avvikelse-measure-form';
import { type MeasureForm, measureFormChanges, measureFormCreate } from './measure-form';

/** Avvikelse owns its form and workflow; the tab flag and transport do not select business rules. */
export function AvvikelseMeasures({
  snapshot,
  errand,
  municipalityId,
  onDirtyChange,
  onSaved,
  followUp = false,
}: {
  snapshot: MeasuresSnapshot;
  errand: SupportErrand;
  municipalityId: string;
  onDirtyChange: (dirty: boolean) => void;
  /** Reloads the tab and hands back what it read, so a conflict can rebase on the current measure. */
  onSaved: () => Promise<MeasuresSnapshot | undefined>;
  followUp?: boolean;
}) {
  const { metadata, creationRoles, registration } = snapshot;
  const user = useUserStore((state) => state.user);
  const snackbar = useSnackbar();
  const confirm = useConfirm();
  const [filters, setFilters] = useState(emptyMeasureFilters);
  const [dialog, setDialog] = useState<
    | { kind: 'edit' | 'decide'; measure: SupportMeasure }
    | { kind: 'follow-up'; measure: SupportMeasure; unavailable?: boolean }
  >();
  const editing = dialog?.kind === 'edit' ? dialog.measure : undefined;
  const [revision, setRevision] = useState(0);
  const [dirty, setDirty] = useState(false);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const listHeadingId = useId();
  const reportDirty = useCallback(
    (value: boolean) => {
      setDirty(value);
      onDirtyChange(value);
    },
    [onDirtyChange]
  );
  const canWrite = user.permissions.canEditSupportManagement && !isSupportErrandLocked(errand);
  const canEdit = !followUp && canWrite;
  const canDecide =
    canEdit &&
    registration.status === 'ready' &&
    creationRoles.some((role) => registration.roleTypes.some((rule) => rule.roleName === role.name && rule.decides));

  // The page form only ever creates; editing happens in a modal so the two are never confused.
  const resetNewForm = () => {
    setRevision((value) => value + 1);
    listHeading.current?.focus();
  };
  const closeEditing = () => setDialog(undefined);
  const requestCloseEditing = async () => {
    if (dirty && !(await confirmDiscardMeasureDraft(confirm, true))) return;
    closeEditing();
  };
  /**
   * A rejected write leaves the open dialog holding a version upstream has moved past, so every retry fails the
   * same way and the draft is trapped. Reload and put the current measure under the dialog instead: the form is
   * keyed by id, not version, so the typed values survive while measureFormChanges recomputes against the new
   * baseline - fields the other writer already set to the same value drop out of the patch by themselves.
   */
  const rebaseOnCurrent = async (measureId: string, kind: 'edit' | 'decide' | 'follow-up') => {
    const snapshot = await onSaved();
    // A failed reload is not evidence the measure is gone, and closing here would discard the draft. Leave the
    // dialog as it stands; the write error is already on screen and the tab shows its own reload failure.
    if (!snapshot) return;
    const current = snapshot.measures.find((measure) => measure.id === measureId);
    if (current) setDialog({ kind, measure: current });
    else if (kind === 'follow-up') {
      // Preserve the answers even when the measure disappeared, and explicitly disable submission.
      setDialog((open) => (open?.kind === 'follow-up' ? { ...open, unavailable: true } : open));
    } else setDialog(undefined);
  };

  const save = async (values: MeasureForm) => {
    if (!canEdit || !errand.id) throw new Error('SupportMeasure is not writable');
    if (editing) {
      if (!editing.id) throw new Error('SupportMeasure is missing its identity');
      const measureId = editing.id;
      try {
        await updateSupportMeasure(
          municipalityId,
          errand.id,
          measureId,
          editing.version,
          measureFormChanges(values, editing)
        );
      } catch (cause) {
        if (isSupportErrandWriteConflict(cause)) await rebaseOnCurrent(measureId, 'edit');
        throw cause;
      }
    } else {
      await createSupportMeasure(municipalityId, errand.id, measureFormCreate(values));
    }
    // Retire the saved draft before reloading so a failed read does not cause a duplicate write.
    if (editing) closeEditing();
    else resetNewForm();
    snackbar({ message: 'Åtgärden har sparats.', status: 'success' });
    await onSaved();
  };

  const saveDecision = async (decision: MeasureDecisionInput) => {
    const measure = dialog?.kind === 'decide' ? dialog.measure : undefined;
    if (!canDecide || !errand.id || !measure?.id || !measureCanBeDecided(measure))
      throw new Error('SupportMeasure is not decidable');
    const measureId = measure.id;
    try {
      await decideSupportMeasure(municipalityId, errand.id, measureId, measure.version, decision);
    } catch (cause) {
      // The dialog stays open on its own error, and the refreshed measure tells it whether a decision is still
      // open to make. Closing here would throw away a comment the user may want to keep.
      if (isSupportErrandWriteConflict(cause)) await rebaseOnCurrent(measureId, 'decide');
      throw cause;
    }
    // Clear the dialog before reloading so a failed read never invites a second submission.
    setDialog(undefined);
    listHeading.current?.focus();
    snackbar({ message: 'Beslutet har sparats.', status: 'success' });
    await onSaved();
  };

  const saveFollowUp = async (values: MeasureFollowUpInput) => {
    const measure = dialog?.kind === 'follow-up' && !dialog.unavailable ? dialog.measure : undefined;
    if (!followUp || !canWrite || !errand.id || !measure?.id || !measureCanBeFollowedUp(measure)) {
      throw new Error('Measure cannot be followed up');
    }
    try {
      await followUpSupportMeasure(municipalityId, errand.id, measure.id, measure.version, values);
    } catch (cause) {
      // Any failure can be a confirmed document followed by an unconfirmed execution write.
      await rebaseOnCurrent(measure.id, 'follow-up');
      throw cause;
    }
    setDialog(undefined);
    listHeading.current?.focus();
    snackbar({ message: 'Åtgärden är markerad som utförd och uppföljningen har sparats.', status: 'success' });
    await onSaved();
  };

  const measures = followUp ? snapshot.measures.filter(measureBelongsInFollowUp) : snapshot.measures;
  const shownMeasures = filterMeasures(measures, filters, metadata.measureTypes ?? []);

  return (
    <div className="min-w-0 flex flex-col gap-32">
      {canEdit && creationRoles.length === 0 && (
        <div>
          <h3 className="text-h3-sm mb-8">Lägg till åtgärder</h3>
          <p role="status">{registrationMessage(registration.status)}</p>
        </div>
      )}
      {canEdit && creationRoles.length > 0 && (
        <AvvikelseMeasureForm
          key={`new-${revision}`}
          measureTypes={metadata.measureTypes}
          creationRoles={creationRoles}
          roles={metadata.roles}
          registration={registration}
          onSave={save}
          onCancel={resetNewForm}
          onDirtyChange={reportDirty}
        />
      )}
      {/* Mounted only while editing: an always-mounted Headless UI Transition throws when the tab's subtree is
          hidden and shown again during an in-place reload. */}
      {canEdit && editing && (
        <Modal
          show
          hideLabel
          aria-label="Redigera åtgärd"
          closeLabel="Stäng"
          disableCloseOutside
          className="w-full max-w-[84rem]"
          onClose={() => void requestCloseEditing()}
          data-cy="measure-edit-modal"
        >
          <Modal.Content>
            {editing && (
              <AvvikelseMeasureForm
                key={editing.id}
                measure={editing}
                measureTypes={metadata.measureTypes}
                creationRoles={creationRoles}
                roles={metadata.roles}
                registration={registration}
                onSave={save}
                onCancel={closeEditing}
                onDirtyChange={reportDirty}
              />
            )}
          </Modal.Content>
        </Modal>
      )}
      {canDecide && dialog?.kind === 'decide' && (
        <AvvikelseMeasureDecisionDialog
          measure={dialog.measure}
          title={measureTypeLabel(metadata.measureTypes, dialog.measure)}
          onSave={saveDecision}
          onClose={() => setDialog(undefined)}
          onDirtyChange={reportDirty}
        />
      )}
      {followUp && canWrite && dialog?.kind === 'follow-up' && (
        <AvvikelseMeasureFollowUpDialog
          measure={dialog.measure}
          unavailable={dialog.unavailable}
          title={measureTypeLabel(metadata.measureTypes, dialog.measure)}
          onSave={saveFollowUp}
          onClose={() => setDialog(undefined)}
          onDirtyChange={reportDirty}
        />
      )}
      {!canWrite && <p>Åtgärderna visas skrivskyddade.</p>}
      <section aria-labelledby={listHeadingId} className="border-t-1 pt-24 flex flex-col gap-16">
        <div className="flex flex-wrap items-start justify-between gap-16">
          <h3
            id={listHeadingId}
            ref={listHeading}
            tabIndex={-1}
            className="text-h3-sm focus-visible:outline focus-visible:outline-2"
          >
            {followUp ? 'Åtgärder att följa upp' : 'Tillagda åtgärder'} ({measures.length})
          </h3>
          {/* The plan is made from the stored measures by the BFF; follow-up shows the same list but offers no plan. */}
          {!followUp && canWrite && (
            <MeasureActionPlanButton errand={errand} municipalityId={municipalityId} measureCount={measures.length} />
          )}
        </div>
        {measures.length > 0 && (
          <MeasureFilterBar
            filters={filters}
            onChange={setFilters}
            {...measureFilterOptions(measures, metadata.measureTypes ?? [], metadata.roles ?? [])}
            shown={shownMeasures.length}
            total={measures.length}
          />
        )}
        <MeasureList
          measures={shownMeasures}
          emptyMessage={
            isMeasureFilterActive(filters)
              ? 'Inga åtgärder matchar filtret.'
              : followUp
              ? 'Det finns inga planerade och godkända åtgärder att följa upp.'
              : 'Det finns inga åtgärder registrerade.'
          }
          types={metadata.measureTypes ?? []}
          roles={metadata.roles ?? []}
          currentUser={user.username}
          onEdit={canEdit && !dirty && !dialog ? (measure) => setDialog({ kind: 'edit', measure }) : undefined}
          onDecide={canDecide && !dirty && !dialog ? (measure) => setDialog({ kind: 'decide', measure }) : undefined}
          onFollowUp={
            followUp && canWrite && !dirty && !dialog
              ? (measure) => setDialog({ kind: 'follow-up', measure })
              : undefined
          }
        />
      </section>
    </div>
  );
}

function registrationMessage(status: MeasuresSnapshot['registration']['status']): string {
  switch (status) {
    case 'unconfigured':
      return 'Registrering av åtgärder är inte konfigurerad för den här verksamheten. Kontakta administratören. Du kan fortfarande läsa befintliga åtgärder.';
    case 'invalid':
      return 'Inställningarna för åtgärdernas roller och typer behöver ses över. Kontakta administratören. Du kan fortfarande läsa befintliga åtgärder.';
    case 'ready':
      return 'Du har ingen registreringsroll för åtgärder i den här verksamheten. Kontakta administratören om du behöver kunna lägga till åtgärder.';
  }
}
