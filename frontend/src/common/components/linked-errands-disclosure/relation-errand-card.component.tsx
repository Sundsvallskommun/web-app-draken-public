'use client';

import { CaseLabels } from '@casedata/interfaces/case-label';
import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';
import { CaseStatusResponse, findOperationUsingNamespace } from '@common/services/casestatus-service';
import { Button, Icon } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { ChevronDown, Link2, Link2Off, Mail } from 'lucide-react';
import { FC, useState } from 'react';

interface RelationErrandCardProps {
  errand: CaseStatusResponse;
  linked?: boolean;
  onToggleLink?: () => void;
  onOpenMessage?: () => void;
  actionsDisabled?: boolean;
}

interface RelationErrandCardActionsProps {
  caseId?: string;
  linked?: boolean;
  onToggleLink?: () => void;
  onOpenMessage?: () => void;
  actionsDisabled?: boolean;
}

const caseTypeLabel = (errand: CaseStatusResponse) =>
  (CaseLabels.ALL as Record<string, string>)[errand.caseType ?? ''] ?? errand.caseType ?? '';

const RelationErrandCardActions: FC<RelationErrandCardActionsProps> = ({
  caseId,
  linked,
  onToggleLink,
  onOpenMessage,
  actionsDisabled,
}) => {
  const showMessageAction = linked && onOpenMessage;
  const showLinkAction = !!onToggleLink;
  if (!showMessageAction && !showLinkAction) return null;

  return (
    <div className="flex flex-wrap gap-8">
      {showMessageAction ? (
        <Button
          size="sm"
          variant="primary"
          color="vattjom"
          disabled={actionsDisabled}
          leftIcon={<Icon icon={<Mail size={16} />} />}
          onClick={onOpenMessage}
          data-cy={`relation-card-message-${caseId}`}
        >
          Skicka meddelande
        </Button>
      ) : null}
      {showLinkAction ? (
        <Button
          size="sm"
          variant={linked ? 'secondary' : 'primary'}
          color="primary"
          disabled={actionsDisabled}
          leftIcon={<Icon icon={linked ? <Link2Off size={16} /> : <Link2 size={16} />} />}
          onClick={onToggleLink}
          data-cy={`relation-card-link-${caseId}`}
        >
          {linked ? 'Bryt koppling' : 'Koppla'}
        </Button>
      ) : null}
    </div>
  );
};

const RelationErrandCardDetails: FC<{ errand: CaseStatusResponse }> = ({ errand }) => (
  <div className="px-12 pb-12 pt-8 border-t border-divider flex flex-col gap-12">
    <div className="flex flex-col gap-4 text-small">
      <div>
        <span className="font-bold">Ärendetyp: </span>
        {caseTypeLabel(errand) || '-'}
      </div>
      <div>
        <span className="font-bold">Verksamhet: </span>
        {findOperationUsingNamespace(errand.namespace ?? '')}
      </div>
      {errand.lastStatusChange ? (
        <div>
          <span className="font-bold">Senaste aktivitet: </span>
          {dayjs(errand.lastStatusChange).format('YYYY-MM-DD, HH:mm')}
        </div>
      ) : null}
    </div>
  </div>
);

export const RelationErrandCard: FC<RelationErrandCardProps> = ({
  errand,
  linked,
  onToggleLink,
  onOpenMessage,
  actionsDisabled,
}) => {
  const [expanded, setExpanded] = useState(true);
  const statusText = errand.externalStatus ?? errand.status ?? '';
  const toggleExpanded = () => setExpanded(!expanded);

  return (
    <div
      className="w-full border border-divider rounded-cards bg-background-content"
      data-cy={`relation-card-${errand.caseId}`}
    >
      <div className="flex flex-wrap items-start gap-8 p-12">
        <button
          type="button"
          className="flex min-w-0 flex-1 basis-[18rem] flex-col items-start gap-4 text-left"
          aria-expanded={expanded}
          onClick={toggleExpanded}
          data-cy={`relation-card-toggle-${errand.caseId}`}
        >
          <CaseStatusLabelComponent externalStatus={statusText} />
          <span className="text-small">
            <span className="font-bold">Ärendenummer: </span>
            <span className="break-all">{errand.errandNumber}</span>
          </span>
        </button>
        <RelationErrandCardActions
          caseId={errand.caseId}
          linked={linked}
          onToggleLink={onToggleLink}
          onOpenMessage={onOpenMessage}
          actionsDisabled={actionsDisabled}
        />
        <button
          type="button"
          className="ml-auto flex shrink-0 items-center justify-center text-dark-secondary"
          aria-expanded={expanded}
          aria-label={expanded ? 'Dölj ärendedetaljer' : 'Visa ärendedetaljer'}
          onClick={toggleExpanded}
          data-cy={`relation-card-toggle-icon-${errand.caseId}`}
        >
          <ChevronDown size={20} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {expanded ? <RelationErrandCardDetails errand={errand} /> : null}
    </div>
  );
};
