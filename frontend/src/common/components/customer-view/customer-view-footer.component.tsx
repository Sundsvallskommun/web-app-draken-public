'use client';

import { StakeholderCardContact } from '@common/components/stakeholder-card/stakeholder-card.component';
import { usePartyAssetServices } from '@common/hooks/use-asset-services';
import { getStatusesUsingOrganizationNumber, getStatusesUsingPartyId } from '@common/services/casestatus-service';
import { Button, Icon, Spinner } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { ArrowRight, FileText, ListChecks } from 'lucide-react';
import { FC, useEffect, useState } from 'react';

import { CustomerViewModal } from './customer-view-modal.component';

interface CustomerViewFooterProps {
  partyId: string;
  organizationNumber?: string;
  contact: StakeholderCardContact;
  assetTypes?: string[];
  activeStatuses?: string[];
}

export const CustomerViewFooter: FC<CustomerViewFooterProps> = ({
  partyId,
  organizationNumber,
  contact,
  assetTypes = [],
  activeStatuses = [],
}) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [showModal, setShowModal] = useState(false);
  const [errandCount, setErrandCount] = useState<number>();
  const [errandError, setErrandError] = useState(false);

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
      .then((statuses) => {
        if (active) {
          setErrandCount(statuses.length);
          setErrandError(false);
        }
      })
      .catch(() => {
        if (active) {
          setErrandCount(undefined);
          setErrandError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [municipalityId, partyId, organizationNumber]);

  const activeStatusSet = new Set(activeStatuses);
  const activeServicesCount = partyServices?.filter((s) => s.status && activeStatusSet.has(s.status)).length ?? 0;

  return (
    <div className="pt-12 pb-20 px-16 border-t-1" data-cy="customer-view-footer">
      <div className="flex items-center justify-between gap-12 flex-wrap">
        <div className="flex items-center gap-24 flex-wrap">
          <span className="flex items-center gap-8">
            <Icon icon={<FileText size={18} />} />
            <span className="text-small" data-cy="customer-view-errand-count">
              {errandError ? (
                '– ärenden'
              ) : errandCount === undefined ? (
                <Spinner size={2} aria-label="Hämtar ärenden" />
              ) : (
                `${errandCount} ärenden`
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
                  `${activeServicesCount} aktiva tjänster`
                )}
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
        <CustomerViewModal show={showModal} onClose={() => setShowModal(false)} contact={contact} />
      </div>
    </div>
  );
};
