'use client';

import { Asset, AssetStatus } from '@common/interfaces/asset';
import { getCustomerAssets } from '@common/services/customer-service';
import { Button, Label, Spinner, Table } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import dayjs from 'dayjs';
import { ChevronRight } from 'lucide-react';
import NextLink from 'next/link';
import { FC, useEffect, useState } from 'react';

type LookupResult = { customerId: string; assets: Asset[] } | { customerId: string; error: true };

const formatDate = (date?: string | null): string => (date ? dayjs(date).format('YYYY-MM-DD') : '–');

const statusPresentation: Record<AssetStatus | 'REPLACED', { label: string; color: string }> = {
  ACTIVE: { label: 'Gällande', color: 'gronsta' },
  TEMPORARY: { label: 'Tillfälligt', color: 'info' },
  EXPIRED: { label: 'Utgånget', color: 'tertiary' },
  BLOCKED: { label: 'Blockerat', color: 'error' },
  REPLACED: { label: 'Ersatt', color: 'tertiary' },
  DRAFT: { label: 'Utkast', color: 'tertiary' },
};

const AssetStatusLabel: FC<{ status?: Asset['status'] }> = ({ status }) => {
  if (!status) {
    return <span>–</span>;
  }
  const presentation = statusPresentation[status] ?? { label: status, color: 'tertiary' };
  return (
    <Label rounded inverted color={presentation.color} className="max-h-full h-auto whitespace-nowrap gap-6">
      <span className="inline-block w-8 h-8 rounded-full" style={{ backgroundColor: 'currentColor' }} aria-hidden />
      {presentation.label}
    </Label>
  );
};

// TODO: Replace with real type labels when the AOT asset type(s) are decided.
const assetTypeLabel = (type?: string): string => type ?? '–';

// Secondary line under the type, e.g. "Stadigvarande försäljning" in the design.
const assetKind = (asset: Asset): string | undefined => asset.additionalParameters?.permitKind ?? asset.description;

const headers = ['Status', 'Diarienr', 'Typ', 'Handläggare', 'Beslutsdatum'];

/**
 * Tillstånd tab: lists the customer's PartyAssets.
 */
export const CustomerAssets: FC<{ customerId: string }> = ({ customerId }) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [result, setResult] = useState<LookupResult | null>(null);

  useEffect(() => {
    if (!municipalityId) {
      return;
    }
    let cancelled = false;
    getCustomerAssets(municipalityId, customerId)
      .then((assets) => {
        if (!cancelled) {
          setResult({ customerId, assets });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ customerId, error: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [municipalityId, customerId]);

  const content = () => {
    const error = (
      <p className="m-0 text-error" role="alert" data-cy="customer-assets-error">
        Tillstånd kunde inte hämtas.
      </p>
    );

    // Without a municipalityId the lookup never runs, so show the error rather than a spinner.
    if (!municipalityId) {
      return error;
    }

    if (!result || result.customerId !== customerId) {
      return <Spinner size={4} aria-label="Hämtar tillstånd" />;
    }

    if ('error' in result) {
      return error;
    }

    if (result.assets.length === 0) {
      return (
        <p className="m-0 text-dark-secondary" data-cy="customer-assets-empty">
          Inga tillstånd.
        </p>
      );
    }

    return (
      <Table data-cy="customer-assets-table" aria-label="Tillstånd" scrollable background>
        <Table.Header>
          {headers.map((header) => (
            <Table.HeaderColumn key={header}>{header}</Table.HeaderColumn>
          ))}
          <Table.HeaderColumn>
            <span className="sr-only">Öppna</span>
          </Table.HeaderColumn>
        </Table.Header>
        <Table.Body>
          {result.assets.map((asset) => {
            const kind = assetKind(asset);
            return (
              <Table.Row key={asset.id} data-cy={`customer-asset-${asset.id}`}>
                <Table.Column>
                  <AssetStatusLabel status={asset.status} />
                </Table.Column>
                <Table.Column>{asset.sourceErrandNumber ?? '–'}</Table.Column>
                <Table.Column>
                  <span className="font-bold">{assetTypeLabel(asset.type)}</span>
                  {kind && <span className="text-dark-secondary"> · {kind}</span>}
                </Table.Column>
                {/* TODO: Handläggare is not on the asset; needs the source errand's assignee. */}
                <Table.Column>–</Table.Column>
                <Table.Column>{formatDate(asset.issued)}</Table.Column>
                <Table.Column className="text-right">
                  {asset.sourceErrandNumber ? (
                    <NextLink href={`/arende/${asset.sourceErrandNumber}`} passHref className="no-underline">
                      <Button
                        variant="tertiary"
                        size="sm"
                        iconButton
                        aria-label={`Öppna ärende ${asset.sourceErrandNumber}`}
                        data-cy={`customer-asset-open-${asset.id}`}
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </NextLink>
                  ) : (
                    <ChevronRight size={16} className="inline-block text-dark-secondary" aria-hidden />
                  )}
                </Table.Column>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    );
  };

  return (
    <div className="flex flex-col gap-16" data-cy="customer-assets">
      <h2 className="m-0 text-h3-md">Tillstånd</h2>
      <p className="m-0 text-small">
        Serverings- och tobakstillstånd som rör organisationen. Klicka på ett tillstånd för att se det i sin helhet.
        <br />
        <span className="text-dark-secondary">Datan kommer från Alkohol och Tobak-Draken.</span>
      </p>
      {content()}
    </div>
  );
};
