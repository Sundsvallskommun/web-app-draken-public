'use client';

import { CaseLabels } from '@casedata/interfaces/case-label';
import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';
import { CaseStatusResponse, findOperationUsingNamespace } from '@common/services/casestatus-service';
import { Button, Icon } from '@sk-web-gui/react';
import { ChevronDown, Link2, Link2Off, Mail } from 'lucide-react';
import { FC, useState } from 'react';

interface RelationErrandCardProps {
  errand: CaseStatusResponse;
  linked?: boolean;
  onToggleLink?: () => void;
  onOpenMessage?: () => void;
}

const caseTypeLabel = (errand: CaseStatusResponse) =>
  (CaseLabels.ALL as Record<string, string>)[errand.caseType ?? ''] ?? errand.caseType ?? '';

export const RelationErrandCard: FC<RelationErrandCardProps> = ({ errand, linked, onToggleLink, onOpenMessage }) => {
  const [expanded, setExpanded] = useState(false);
  const statusText = errand.externalStatus ?? errand.status ?? '';

  return (
    <div
      className="w-full border border-divider rounded-cards bg-background-content"
      data-cy={`relation-card-${errand.caseId}`}
    >
      <button
        type="button"
        className="w-full flex items-center gap-12 p-12 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        data-cy={`relation-card-toggle-${errand.caseId}`}
      >
        <CaseStatusLabelComponent externalStatus={statusText} />
        <span className="font-bold text-small flex-1 min-w-0 break-all">{errand.errandNumber}</span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-dark-secondary transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded ? (
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
          </div>
          {onToggleLink || (linked && onOpenMessage) ? (
            <div className="flex flex-wrap gap-8">
              {linked && onOpenMessage ? (
                <Button
                  size="sm"
                  variant="primary"
                  color="vattjom"
                  leftIcon={<Icon icon={<Mail size={16} />} />}
                  onClick={onOpenMessage}
                  data-cy={`relation-card-message-${errand.caseId}`}
                >
                  Skicka meddelande
                </Button>
              ) : null}
              {onToggleLink ? (
                <Button
                  size="sm"
                  variant={linked ? 'secondary' : 'primary'}
                  color="primary"
                  leftIcon={<Icon icon={linked ? <Link2Off size={16} /> : <Link2 size={16} />} />}
                  onClick={onToggleLink}
                  data-cy={`relation-card-link-${errand.caseId}`}
                >
                  {linked ? 'Bryt koppling' : 'Koppla'}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
