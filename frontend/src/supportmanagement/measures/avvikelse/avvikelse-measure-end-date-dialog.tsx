import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { Alert, Button, FormControl, FormErrorMessage, FormLabel, Input, Modal, useConfirm } from '@sk-web-gui/react';
import { isAxiosError } from 'axios';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';

import { measureCanBeFollowedUp } from '../measure-follow-up';
import { measureDateLabels, measureDateTime, measureFormValues, plannedMeasureDateErrors } from './measure-form';

/**
 * Moves an approved measure's end date from the follow-up. The start is part of the decision, so it is shown and not
 * offered: only the end may slip.
 */
export function AvvikelseMeasureEndDateDialog({
  measure,
  unavailable = false,
  title,
  onSave,
  onClose,
  onDirtyChange,
}: {
  measure: Measure;
  unavailable?: boolean;
  title: string;
  /** Receives the new end date as the timestamp the API stores. */
  onSave: (plannedComplete: string) => Promise<void>;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const id = useId();
  const heading = useRef<HTMLSpanElement>(null);
  const busy = useRef(false);
  const { plannedStart, plannedComplete: savedEnd } = measureFormValues(measure);
  const [plannedComplete, setPlannedComplete] = useState(savedEnd);
  const [dateError, setDateError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();
  const available = !unavailable && measureCanBeFollowedUp(measure);
  const dirty = plannedComplete !== savedEnd;

  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  const requestClose = async () => {
    if (busy.current) return;
    if (
      dirty &&
      !(await confirm.showConfirmation(
        'Avbryt ändringen?',
        'Det nya slutdatumet sparas inte. Vill du fortsätta?',
        'Ja, avbryt',
        'Nej, behåll',
        'warning',
        'question'
      ))
    )
      return;
    if (!busy.current) onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current || !available) return;
    const error = plannedMeasureDateErrors(plannedStart, plannedComplete).plannedComplete;
    setDateError(error);
    setSaveError(undefined);
    if (error) return;
    busy.current = true;
    setSaving(true);
    try {
      await onSave(measureDateTime(plannedComplete));
    } catch (cause) {
      setSaveError(endDateSaveError(cause));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      show
      // Titled in the modal's own header, which takes the focus so that the title is read first.
      label={
        <span ref={heading} tabIndex={-1} className="focus-visible:outline focus-visible:outline-2">
          Ändra slutdatum
        </span>
      }
      closeLabel="Stäng"
      closeButtonProps={{ disabled: saving }}
      disableCloseOutside
      initialFocus={heading}
      className="w-full max-w-[60rem]"
      onClose={() => void requestClose()}
    >
      <Modal.Content>
        <form onSubmit={submit} noValidate aria-busy={saving} className="flex flex-col gap-24">
          <section aria-label="Åtgärden" className="border-1 rounded-12 p-16 flex flex-col gap-8">
            <h4 className="font-bold">{title}</h4>
            {measure.description && <p className="whitespace-pre-wrap break-words">{measure.description}</p>}
            {plannedStart && (
              <p data-cy="measure-decided-start">
                <strong>Påbörjas:</strong> {plannedStart}
              </p>
            )}
          </section>
          <p>Startdatumet är beslutat och ändras inte. Slutdatumet kan flyttas om åtgärden tar längre tid.</p>
          {!available && <p role="status">Åtgärden är redan uppföljd, och slutdatumet kan inte längre ändras.</p>}
          {saveError && (
            <div role="alert">
              <Alert type="error">
                <Alert.Content>{saveError}</Alert.Content>
              </Alert>
            </div>
          )}
          <FormControl id={`${id}-plannedComplete`} invalid={Boolean(dateError)} className="w-full">
            <FormLabel>{measureDateLabels.plannedComplete} (Obligatoriskt)</FormLabel>
            <Input
              id={`${id}-plannedComplete`}
              type="date"
              value={plannedComplete}
              min={plannedStart || undefined}
              onChange={(event) => setPlannedComplete(event.target.value)}
              disabled={saving || !available}
              aria-required
              className="w-full"
            />
            {dateError && <FormErrorMessage>{dateError}</FormErrorMessage>}
          </FormControl>
          <div className="flex flex-wrap gap-12">
            <Button type="submit" disabled={saving || !available || !dirty} loading={saving}>
              Spara slutdatum
            </Button>
            <Button type="button" variant="secondary" disabled={saving} onClick={() => void requestClose()}>
              Avbryt
            </Button>
          </div>
        </form>
      </Modal.Content>
    </Modal>
  );
}

function endDateSaveError(cause: unknown): string {
  switch (isAxiosError(cause) ? cause.response?.status : undefined) {
    case 400:
      return 'Slutdatumet kunde inte sparas. Kontrollera att det inte ligger före startdatumet.';
    case 401:
    case 403:
      return 'Du saknar behörighet att ändra åtgärdens slutdatum.';
    case 409:
    case 412:
      return 'Åtgärden har ändrats av någon annan. Ditt datum finns kvar: kontrollera det och spara igen.';
    default:
      return 'Slutdatumet kunde inte sparas. Ladda om åtgärderna innan du försöker igen.';
  }
}
