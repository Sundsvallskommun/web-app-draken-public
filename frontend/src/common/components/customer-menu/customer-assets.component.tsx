'use client';

import { Asset, AssetStatus } from '@common/interfaces/asset';
import { CustomerAsset } from '@common/services/customer-service';
import { Label, Spinner, Table } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import dayjs from 'dayjs';
import { ChevronRight } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { openErrand } from './customer-errands-tab.component';
import type { CustomerLookup } from './use-customer-lookup';

const formatDate = (date?: string | null): string => (date ? dayjs(date).format('YYYY-MM-DD') : '–');

const statusColors: Record<AssetStatus | 'REPLACED', string> = {
  ACTIVE: 'gronsta',
  TEMPORARY: 'info',
  EXPIRED: 'tertiary',
  BLOCKED: 'error',
  REPLACED: 'tertiary',
  DRAFT: 'tertiary',
};

export const AssetStatusLabel: FC<{ status?: Asset['status'] }> = ({ status }) => {
  const { t } = useTranslation();
  if (!status) {
    return <span>–</span>;
  }
  return (
    <Label
      rounded
      inverted
      color={statusColors[status] ?? 'tertiary'}
      className="max-h-full h-auto whitespace-nowrap gap-6"
    >
      <span className="inline-block w-8 h-8 rounded-full" style={{ backgroundColor: 'currentColor' }} aria-hidden />
      {t(`common:customer.assets.status.${status}`, status)}
    </Label>
  );
};

// Secondary line under the type, e.g. "Stadigvarande försäljning" in the design.
const assetKind = (asset: Asset): string | undefined => asset.additionalParameters?.permitKind ?? asset.description;

const AssetRow: FC<{ customerAsset: CustomerAsset }> = ({ customerAsset }) => {
  const { t } = useTranslation();
  const { asset, registrationNumber, caseOfficer, decisionDate, errandNumber } = customerAsset;
  const kind = assetKind(asset);
  const opensErrand = errandNumber
    ? {
        tabIndex: 0,
        role: 'button',
        'aria-label': t('common:customer.assets.openRow', { errandNumber }),
        onKeyDown: (e: React.KeyboardEvent) => (e.key === 'Enter' ? openErrand(errandNumber) : null),
        onClick: () => openErrand(errandNumber),
        className: 'cursor-pointer',
      }
    : {};

  return (
    <Table.Row data-cy={`customer-asset-${asset.id}`} {...opensErrand}>
      <Table.Column>
        <AssetStatusLabel status={asset.status} />
      </Table.Column>
      <Table.Column>{registrationNumber ?? '–'}</Table.Column>
      <Table.Column>
        <span>
          <span className="font-bold">{asset.title ?? asset.type ?? '–'}</span>
          {kind && <span className="text-dark-secondary"> · {kind}</span>}
        </span>
      </Table.Column>
      <Table.Column>{caseOfficer ?? '–'}</Table.Column>
      <Table.Column>{formatDate(decisionDate)}</Table.Column>
      <Table.Column className="text-right">
        {errandNumber && <ChevronRight size={16} className="inline-block" aria-hidden />}
      </Table.Column>
    </Table.Row>
  );
};

/**
 * Tillstånd tab: lists the customer's PartyAssets. A row opens the errand the asset came from.
 */
export const CustomerAssets: FC<{ assets: CustomerLookup<CustomerAsset[]> }> = ({ assets }) => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const content = () => {
    if (!municipalityId || assets.status === 'error') {
      return (
        <p className="m-0 text-error" role="alert" data-cy="customer-assets-error">
          {t('common:customer.assets.error')}
        </p>
      );
    }

    if (assets.status === 'loading') {
      return <Spinner size={4} aria-label={t('common:customer.assets.loading')} />;
    }

    if (assets.data.length === 0) {
      return (
        <p className="m-0 text-dark-secondary" data-cy="customer-assets-empty">
          {t('common:customer.assets.empty')}
        </p>
      );
    }

    return (
      <Table data-cy="customer-assets-table" aria-label={t('common:customer.assets.title')} scrollable background>
        <Table.Header>
          <Table.HeaderColumn>{t('common:customer.assets.columns.status')}</Table.HeaderColumn>
          <Table.HeaderColumn>{t('common:customer.assets.columns.registrationNumber')}</Table.HeaderColumn>
          <Table.HeaderColumn>{t('common:customer.assets.columns.type')}</Table.HeaderColumn>
          <Table.HeaderColumn>{t('common:customer.assets.columns.caseOfficer')}</Table.HeaderColumn>
          <Table.HeaderColumn>{t('common:customer.assets.columns.decisionDate')}</Table.HeaderColumn>
          <Table.HeaderColumn>
            <span className="sr-only">{t('common:customer.assets.columns.open')}</span>
          </Table.HeaderColumn>
        </Table.Header>
        <Table.Body>
          {assets.data.map((customerAsset) => (
            <AssetRow key={customerAsset.asset.id} customerAsset={customerAsset} />
          ))}
        </Table.Body>
      </Table>
    );
  };

  return (
    <div className="flex flex-col gap-16" data-cy="customer-assets">
      <h2 className="m-0 text-h3-md">{t('common:customer.assets.title')}</h2>
      <p className="m-0 text-small">
        {t('common:customer.assets.intro')}
        <br />
        <span className="text-dark-secondary">{t('common:customer.assets.source')}</span>
      </p>
      {content()}
    </div>
  );
};
