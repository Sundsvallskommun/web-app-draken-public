import { Button, Spinner } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/support-store';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { isAxiosError } from 'axios';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

// One composition point, with business rules in their own module. useMeasures only controls visibility.
// Imported statically on purpose: next/dynamic suspends again when this tab re-renders while its content stays
// mounted (the in-place reload after a save), which hides and re-shows the surrounding subtree and makes the
// design system's Headless UI transitions throw "Did you forget to passthrough the ref".
import { AvvikelseMeasures } from './avvikelse/avvikelse-measures';
import { getSupportMeasures, type MeasuresSnapshot } from './support-measure-service';

type MeasuresState =
  | { status: 'loading' }
  | { status: 'failed'; message: string }
  // A reload after our own write keeps the snapshot on screen; only the first load shows the spinner.
  | { status: 'ready'; snapshot: MeasuresSnapshot; refreshing: boolean; refreshError?: string };

const readErrorMessage = (cause: unknown): string =>
  isAxiosError(cause) && [401, 403].includes(cause.response?.status ?? 0)
    ? 'Du saknar behörighet att läsa åtgärder.'
    : 'Åtgärder eller åtgärdsmetadata kunde inte hämtas.';

export function SupportMeasuresTab({
  errand,
  municipalityId,
  onDirtyChange,
  isActive,
  followUp = false,
}: {
  errand: SupportErrand;
  municipalityId: string;
  onDirtyChange: (dirty: boolean) => void;
  isActive: boolean;
  followUp?: boolean;
}) {
  const [state, setState] = useState<MeasuresState>({ status: 'loading' });
  const { register, resetField, getValues } = useFormContext<SupportErrand>();
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    register('version');
  }, [register]);

  const load = useCallback(
    async (expectedErrandVersion?: number): Promise<MeasuresSnapshot | undefined> => {
      const request = ++generation.current;
      setState((current) =>
        current.status === 'ready' ? { ...current, refreshing: true, refreshError: undefined } : { status: 'loading' }
      );
      try {
        if (!errand.id) throw new Error('Missing errand ID');
        const snapshot = await getSupportMeasures(municipalityId, errand.id);
        if (request !== generation.current) return undefined;
        if (expectedErrandVersion !== undefined) {
          // Advance the surrounding form only when our write was the sole version change.
          // Otherwise keep its older version so stale errand fields cannot overwrite someone else's edit.
          const current = useSupportStore.getState().supportErrand;
          if (
            current?.id === errand.id &&
            current.version === expectedErrandVersion &&
            getValues('version') === expectedErrandVersion &&
            snapshot.errandVersion === expectedErrandVersion + 1
          ) {
            useSupportStore.setState({ supportErrand: { ...current, version: snapshot.errandVersion } });
            resetField('version', { defaultValue: snapshot.errandVersion });
          }
        }
        setState({ status: 'ready', snapshot, refreshing: false });
        return snapshot;
      } catch (cause) {
        if (request !== generation.current) return undefined;
        const message = readErrorMessage(cause);
        setState((current) =>
          current.status === 'ready'
            ? { ...current, refreshing: false, refreshError: message }
            : { status: 'failed', message }
        );
        return undefined;
      }
    },
    [errand.id, municipalityId, resetField, getValues]
  );

  const cancelLoad = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    if (isActive) void load();
    return cancelLoad;
  }, [load, cancelLoad, isActive]);

  // Measures are written by several people, so a view left open goes stale: its decide and edit buttons keep
  // offering work that upstream has already taken. Writes stay guarded by If-Match either way; this only stops
  // the list from lying while nobody is looking at it. Refreshing on return is enough - no polling, no socket.
  useEffect(() => {
    if (!isActive) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [load, isActive]);

  let content: ReactNode;
  switch (state.status) {
    case 'loading':
      content = (
        <div role="status">
          <Spinner aria-label="Åtgärder laddas" />
        </div>
      );
      break;
    case 'failed':
      content = (
        <div role="alert" className="flex flex-col gap-16 items-start">
          <p>{state.message}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Försök igen
          </Button>
        </div>
      );
      break;
    case 'ready':
      content = (
        <div aria-busy={state.refreshing} className="flex flex-col gap-24">
          {state.refreshError && (
            <div role="alert" className="flex flex-col gap-16 items-start">
              <p>{state.refreshError} Listan kan vara inaktuell.</p>
              <Button type="button" variant="secondary" onClick={() => void load()}>
                Försök igen
              </Button>
            </div>
          )}
          <AvvikelseMeasures
            snapshot={state.snapshot}
            errand={errand}
            municipalityId={municipalityId}
            onDirtyChange={onDirtyChange}
            onSaved={() => load(state.snapshot.errandVersion)}
            followUp={followUp}
          />
        </div>
      );
      break;
  }

  return (
    <section
      className="p-16 sm:p-32 flex flex-col gap-24"
      aria-label={followUp ? 'Uppföljning' : 'Åtgärder'}
      data-cy={followUp ? 'support-follow-up-tab' : 'support-measures-tab'}
    >
      <h2 ref={heading} tabIndex={-1} className="text-h2-md focus-visible:outline focus-visible:outline-2">
        {followUp ? 'Uppföljning' : 'Åtgärder'}
      </h2>
      {followUp && (
        <p>
          Här följer du upp planerade åtgärder som har godkänts helt eller delvis. Markera Utförd och ange om åtgärden
          har lett till önskad effekt samt vad som har hänt. Åtgärdens innehåll visas skrivskyddat.
        </p>
      )}
      {content}
    </section>
  );
}
