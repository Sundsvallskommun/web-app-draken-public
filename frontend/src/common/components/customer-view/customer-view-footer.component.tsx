'use client';

import { StakeholderCardContact } from '@common/components/stakeholder-card/stakeholder-card.component';
import { usePartyAssetServices } from '@common/hooks/use-asset-services';
import {
  CaseStatusResponse,
  getStatusesUsingOrganizationNumber,
  getStatusesUsingPartyId,
} from '@common/services/casestatus-service';
import { getResolvedRelations } from '@common/services/relations-service';
import { Button, Icon, Spinner } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { ArrowRight, FileText, Link2, ListChecks } from 'lucide-react';
import { FC, useEffect, useMemo, useState } from 'react';

import { CustomerViewModal } from './customer-view-modal.component';

interface CustomerViewFooterProps {
  partyId: string;
  organizationNumber?: string;
  contact: StakeholderCardContact;
  assetTypes?: string[];
  activeStatuses?: string[];
  sourceErrandId?: string;
  onOpenMessage?: (errand: CaseStatusResponse) => void;
}

const pluralize = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`;

export const CustomerViewFooter: FC<CustomerViewFooterProps> = ({
  partyId,
  organizationNumber,
  contact,
  assetTypes = [],
  activeStatuses = [],
  sourceErrandId,
  onOpenMessage,
}) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [showModal, setShowModal] = useState(false);
  const [partyStatuses, setPartyStatuses] = useState<CaseStatusResponse[]>();
  const [errandError, setErrandError] = useState(false);
  const [relationCount, setRelationCount] = useState<number>();

  const { partyServices, loading: servicesLoading } = usePartyAssetServices({
    municipalityId,
    partyId,
    assetTypes,
  });

  useEffect(() => {
    let active = true;
    const fetchStatuses = organizationNumber
      ? getStatusesUsingOrganizationNumber(municipalityId, organizationNumber)
      : getStatusesUsingPartyId(municipalityId, partyId);
    fetchStatuses
      .then((statuses: CaseStatusResponse[]) => {
        if (active) {
          setPartyStatuses(statuses);
          setErrandError(false);
        }
      })
      .catch(() => {
        if (active) {
          setPartyStatuses(undefined);
          setErrandError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [municipalityId, partyId, organizationNumber]);

  // Det aktuella ärendet räknas inte som ett av personens "andra" ärenden. Samma filtrering
  // görs i kundbildens ärendeflik, så att siffran här och listan där alltid stämmer överens.
  const otherErrands = useMemo(
    () => partyStatuses?.filter((status) => status.caseId !== sourceErrandId),
    [partyStatuses, sourceErrandId]
  );

  // Relationer tillhör ärendet, inte personen — räknaren visar hur många av det
  // aktuella ärendets relationer som pekar på något av personens ärenden.
  useEffect(() => {
    let active = true;
    if (!sourceErrandId || !otherErrands) return;
    getResolvedRelations('source', municipalityId, sourceErrandId, 'ASC')
      .then(({ relations }) => {
        if (!active) return;
        const partyCaseIds = new Set(otherErrands.map((s) => s.caseId).filter(Boolean));
        setRelationCount(relations.filter((r) => partyCaseIds.has(r.target.resourceId)).length);
      })
      .catch(() => {
        if (active) setRelationCount(undefined);
      });
    return () => {
      active = false;
    };
  }, [municipalityId, sourceErrandId, otherErrands]);

  const errandCount = otherErrands?.length;

  const activeStatusSet = useMemo(() => new Set(activeStatuses), [activeStatuses]);
  const activeServicesCount = partyServices?.filter((s) => s.status && activeStatusSet.has(s.status)).length ?? 0;
  const errandCountContent = errandError ? '– ärenden' : pluralize(errandCount ?? 0, 'ärende', 'ärenden');

  return (
    <div className="pt-12 pb-20 px-16 border-t-1" data-cy="customer-view-footer">
      <div className="flex items-center justify-between gap-12 flex-wrap">
        <div className="flex items-center gap-24 flex-wrap">
          <span className="flex items-center gap-8">
            <Icon icon={<FileText size={18} />} />
            <span className="text-small" data-cy="customer-view-errand-count">
              {errandCount === undefined && !errandError ? (
                <Spinner size={2} aria-label="Hämtar ärenden" />
              ) : (
                errandCountContent
              )}
            </span>
          </span>
          {assetTypes.length > 0 && (
            <span className="flex items-center gap-8">
              <Icon icon={<ListChecks size={18} />} />
              <span className="text-small" data-cy="customer-view-services-count">
                {servicesLoading ? (
                  <Spinner size={2} aria-label="Hämtar tjänster" />
                ) : (
                  `${pluralize(activeServicesCount, 'aktiv tjänst', 'aktiva tjänster')}`
                )}
              </span>
            </span>
          )}
          {relationCount !== undefined && (
            <span className="flex items-center gap-8">
              <Icon icon={<Link2 size={18} />} />
              <span className="text-small" data-cy="customer-view-relation-count">
                {pluralize(relationCount, 'relation', 'relationer')}
              </span>
            </span>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          data-cy="show-customer-view-button"
          rightIcon={<Icon icon={<ArrowRight size={16} />} />}
          onClick={() => setShowModal(true)}
        >
          Visa kundbild
        </Button>
      </div>
      <CustomerViewModal
        show={showModal}
        onClose={() => setShowModal(false)}
        contact={contact}
        partyId={partyId}
        organizationNumber={organizationNumber}
        sourceErrandId={sourceErrandId}
        assetTypes={assetTypes}
        onOpenMessage={onOpenMessage}
      />
    </div>
  );
};
