import type { MeasureType, Role } from '@common/data-contracts/supportmanagement/data-contracts';
import { getNameFromADUsername } from '@common/services/user-service';
import { Button, Checkbox, Icon, Label } from '@sk-web-gui/react';
import { useUserStore } from '@stores/user-store';
import dayjs from 'dayjs';
import { ClipboardCheck, FileText, Pencil } from 'lucide-react';

import { measureCanBeDecided, measureDecisionPresentation } from './measure-decision';
import { measureCanBeFollowedUp, measureHasFollowUp, type SupportMeasure } from './measure-follow-up';
import { isOwnMeasure } from './measure-ownership';
import { measureTypeLabel } from './measure-types';

const date = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD') : undefined);

function timing(measure: SupportMeasure): { label: string; color: string; dateLine?: string } {
  if (measure.executed)
    return {
      label: measureHasFollowUp(measure) ? 'Utförd' : 'Genomförd',
      color: 'gronsta',
      dateLine: `Genomfört datum: ${date(measure.executed)}`,
    };
  const start = date(measure.plannedStart);
  const complete = date(measure.plannedComplete);
  if (start || complete) {
    const range = start && complete && start !== complete ? `${start} – ${complete}` : start ?? complete;
    return { label: 'Planerad', color: 'vattjom', dateLine: `Planerat datum: ${range}` };
  }
  return { label: 'Ej tidsatt', color: 'bjornstigen' };
}

export function MeasureList({
  measures,
  types,
  roles,
  currentUser,
  onEdit,
  onDecide,
  onFollowUp,
  emptyMessage = 'Det finns inga åtgärder registrerade.',
}: {
  measures: readonly SupportMeasure[];
  types: readonly MeasureType[];
  roles: readonly Role[];
  /** Session username; only the person who registered a measure may edit it. */
  currentUser?: string;
  onEdit?: (measure: SupportMeasure) => void;
  onDecide?: (measure: SupportMeasure) => void;
  onFollowUp?: (measure: SupportMeasure) => void;
  emptyMessage?: string;
}) {
  const administrators = useUserStore((state) => state.administrators);
  // Free text today; measures saved by the earlier picker hold an AD username, so resolve those.
  const userLabel = (username?: string) =>
    username ? getNameFromADUsername(username, administrators) || username : undefined;
  const roleLabel = (name?: string) => roles.find((role) => role.name === name)?.displayName || name;
  if (measures.length === 0) return <p>{emptyMessage}</p>;

  return (
    <ul className="flex flex-col gap-16" aria-label="Registrerade åtgärder">
      {measures.map((measure, index) => {
        const title = measureTypeLabel(types, measure);
        const status = timing(measure);
        const decision = measureDecisionPresentation(measure);
        const decidable = Boolean(onDecide && measureCanBeDecided(measure));
        const creator = userLabel(measure.addedByUser);
        const role = roleLabel(measure.addedByRole);
        const created = measure.created ? dayjs(measure.created).format('YYYY-MM-DD HH:mm:ss') : undefined;
        const editable = Boolean(onEdit && measure.id && isOwnMeasure(measure, currentUser));
        const canFollowUp = Boolean(
          onFollowUp && measureCanBeFollowedUp(measure) && isOwnMeasure(measure, currentUser)
        );
        const responsible = userLabel(measure.responsibleUser);
        return (
          <li
            key={measure.id ?? index}
            className="border-1 rounded-12 bg-background-content p-16 sm:p-24 grid grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto] gap-16 min-w-0"
          >
            <div
              aria-hidden="true"
              className={`shrink-0 w-40 h-40 rounded-8 flex items-center justify-center ${decision.iconClassName}`}
            >
              <Icon icon={<FileText />} size={20} />
            </div>
            <div className="min-w-0 grow flex flex-col gap-8">
              <div className="flex flex-wrap items-center gap-12">
                <h4 className="font-bold">{title}</h4>
                {measureHasFollowUp(measure) && (measure.plannedStart || measure.plannedComplete) && (
                  <Label rounded color="vattjom">
                    Planerad
                  </Label>
                )}
                <Label rounded color={status.color}>
                  {status.label}
                </Label>
                <Label rounded inverted color={decision.color}>
                  {decision.label}
                </Label>
              </div>
              {measure.description && <p className="whitespace-pre-wrap break-words">{measure.description}</p>}
              {measure.goal && (
                <p className="whitespace-pre-wrap break-words">
                  <strong>Mål:</strong> <span>{measure.goal}</span>
                </p>
              )}
              {status.dateLine && <p className="text-small">{status.dateLine}</p>}
              {measure.executed && (measure.plannedStart || measure.plannedComplete) && (
                <p className="text-small">
                  {measure.plannedStart && `Påbörjas: ${date(measure.plannedStart)}`}
                  {measure.plannedStart && measure.plannedComplete && ' • '}
                  {measure.plannedComplete && `Klar senast: ${date(measure.plannedComplete)}`}
                </p>
              )}
              {responsible && (
                <p className="text-small whitespace-pre-wrap break-words">
                  <strong>Ansvarig:</strong> <span>{responsible}</span>
                </p>
              )}
              {measure.acceptMotivation && (
                <div className={`min-w-0 rounded-8 border-l-4 p-12 ${decision.motivationClassName}`}>
                  <h5 className="text-label-medium">{decision.motivationLabel}</h5>
                  <p className="whitespace-pre-wrap break-words">{measure.acceptMotivation}</p>
                </div>
              )}
              {measure.followUp && (
                <div className="rounded-8 border-1 border-gronsta-surface-primary bg-gronsta-background-100 p-12 flex flex-col gap-8">
                  <p>
                    <strong>Önskad effekt uppnådd:</strong> {measure.followUp.desiredEffectAchieved ? 'Ja' : 'Nej'}
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    <strong>Vad har hänt:</strong> {measure.followUp.followUpDescription}
                  </p>
                  {measure.followUp.status === 'pending' && (
                    <p role="status">
                      Svaren är sparade. Genomförandet behöver bekräftas för att slutföra uppföljningen.
                    </p>
                  )}
                  {measure.followUp.status === 'conflict' && (
                    <p role="alert">Genomförandedatumet avviker från uppföljningen. Kontakta administratören.</p>
                  )}
                </div>
              )}
              <p className="text-small text-dark-secondary">
                {creator ? `Skapad av ${creator}` : 'Skapad'}
                {role ? ` (${role})` : ''}
                {created ? ` • ${created}` : ''}
              </p>
            </div>
            {(editable || decidable || canFollowUp) && (
              <div className="col-start-2 sm:col-start-3 flex flex-wrap sm:flex-col items-start gap-8">
                {canFollowUp && (
                  <Checkbox checked={false} aria-label={`Utförd: ${title}`} onChange={() => onFollowUp?.(measure)}>
                    Utförd
                  </Checkbox>
                )}
                {decidable && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    leftIcon={<ClipboardCheck />}
                    aria-label={`Bedöm förslag ${title}`}
                    onClick={() => onDecide?.(measure)}
                  >
                    Bedöm förslag
                  </Button>
                )}
                {editable && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    leftIcon={<Pencil />}
                    aria-label={`Redigera åtgärd ${title}`}
                    onClick={() => onEdit?.(measure)}
                  >
                    Redigera
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
