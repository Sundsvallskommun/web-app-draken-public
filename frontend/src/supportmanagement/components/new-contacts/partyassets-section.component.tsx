'use client';

import { usePartyAssetServices } from '@common/hooks/use-asset-services';
import { Button, Icon, Spinner } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { ArrowRight, ListChecks } from 'lucide-react';
import { useMemo } from 'react';

import { ACTIVE_PARTY_STATUSES, KC_ASSET_TYPES } from '../support-errand/tabs/services/support-errand-services-tab';

export const PartyAssetsSection: React.FC<{ partyId: string }> = ({ partyId }) => {
  const { setActiveTabKey } = useSupportStore();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const { partyServices, loading, error } = usePartyAssetServices({
    municipalityId,
    partyId,
    assetTypes: KC_ASSET_TYPES,
  });

  const total = useMemo(() => partyServices?.length || 0, [partyServices]);
  const activeCount = useMemo(
    () => partyServices?.filter((s) => s.status && ACTIVE_PARTY_STATUSES.has(s.status))?.length || 0,
    [partyServices]
  );

  const action = () => {
    if (loading) {
      return <Spinner size={2} aria-label="Hämtar insatser" />;
    }
    if (error) {
      return (
        <span className="text-small text-error" role="alert">
          Beslut och dokument kunde inte hämtas
        </span>
      );
    }
    if (total === 0) {
      return <span className="text-small text-dark-secondary italic">Inga beslut och dokument</span>;
    }
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        color="vattjom"
        data-cy="show-assets-button"
        rightIcon={<Icon icon={<ArrowRight size={16} />} />}
        onClick={() => setActiveTabKey('services')}
      >
        Visa beslut och dokument
      </Button>
    );
  };

  return (
    <div className="pt-12 pb-20 px-16 border-t-1">
      <div className="flex items-center justify-between gap-12 flex-wrap">
        <div className="flex items-center gap-8">
          <Icon icon={<ListChecks name="list-checks" size={18} />} />
          <span className="font-semibold">Beslut och dokument</span>
          {!loading && !error && total > 0 && (
            <span className="text-small text-dark-secondary">
              {activeCount} aktiva · {total} totalt
            </span>
          )}
        </div>

        {action()}
      </div>
    </div>
  );
};
