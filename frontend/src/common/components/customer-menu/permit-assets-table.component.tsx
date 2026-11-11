'use client';

import {
  formatOrganizationNumber,
  getCustomerIdByOrganizationNumber,
  getPermitAssets,
  PERMIT_ASSET_TYPES,
  PermitAsset,
} from '@common/services/customer-service';
import { Checkbox, Chip, Pagination, PopupMenu, Spinner, Table, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FC, KeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AssetStatusLabel } from './customer-assets.component';
import { TableSearch } from './table-search.component';
import { useCustomerLookup } from './use-customer-lookup';

const headers = [
  'permitHolder',
  'organizationNumber',
  'premises',
  'type',
  'address',
  'registrationNumber',
  'validFrom',
  'status',
];

const formatAddress = ({ street, postalCode, city }: { street?: string; postalCode?: string; city?: string } = {}) =>
  [street, [postalCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

export const PermitAssetsTable: FC = () => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const router = useRouter();
  const toastMessage = useSnackbar();
  const [query, setQuery] = useState({ term: '', activeOnly: true, types: [] as string[], page: 0 });
  const { term, activeOnly, types, page } = query;
  const lookup = useCustomerLookup(
    `${municipalityId}|${term}|${activeOnly}|${types.join(',')}|${page}`,
    municipalityId ? () => getPermitAssets(municipalityId, page, { term, activeOnly, types }) : undefined
  );
  const typeName = (type: string) => t(`common:customer.list.permits.types.${type}`);
  const toggleType = (type: string) =>
    setQuery((current) => ({
      ...current,
      types: current.types.includes(type)
        ? current.types.filter((selected) => selected !== type)
        : [...current.types, type],
      page: 0,
    }));
  const setPage = (newPage: number) => setQuery((current) => ({ ...current, page: newPage }));

  const showError = (message: string) =>
    toastMessage({ position: 'bottom', closeable: false, message, status: 'error' });

  const openCustomer = async ({ asset, permitHolder }: PermitAsset) => {
    if (asset.partyId) {
      router.push(`/kundbild/${asset.partyId}`);
      return;
    }
    const organizationNumber = permitHolder?.organizationNumber;
    if (!organizationNumber) {
      showError(t('common:customer.list.permits.missingOrganizationNumber'));
      return;
    }
    const customerId = await getCustomerIdByOrganizationNumber(organizationNumber).catch(() => undefined);
    if (customerId) {
      router.push(`/kundbild/${customerId}`);
    } else {
      showError(
        t('common:customer.list.permits.customerNotFound', {
          organizationNumber: formatOrganizationNumber(organizationNumber),
        })
      );
    }
  };

  const permits = lookup.status === 'done' ? lookup.data.permits : [];
  const totalPages = lookup.status === 'done' ? lookup.data.totalPages : 0;

  return (
    <div className="flex flex-col gap-16">
      <TableSearch
        data-cy="permit-assets-search"
        placeholder={t('common:customer.list.permits.search')}
        onSearch={(newTerm) => setQuery((current) => ({ ...current, term: newTerm, page: 0 }))}
      />
      <div className="flex gap-16 items-center">
        <div className="flex flex-col md:flex-row justify-start items-center p-10 gap-4 bg-background-200 rounded-groups flex-wrap">
          <div className="relative max-md:w-full">
            <PopupMenu>
              <PopupMenu.Button
                rightIcon={<ChevronDown />}
                data-cy="permit-assets-type-filter"
                variant="tertiary"
                showBackground={false}
                size="sm"
                className="max-md:w-full"
              >
                {t('common:customer.list.permits.headers.type')}
                {types.length > 0 && ` (${types.length})`}
              </PopupMenu.Button>
              <PopupMenu.Panel className="max-md:w-full max-h-[70vh] h-auto overflow-y-auto">
                <PopupMenu.Items autoFocus={false}>
                  {PERMIT_ASSET_TYPES.map((type) => (
                    <PopupMenu.Item key={type}>
                      <Checkbox
                        labelPosition="left"
                        checked={types.includes(type)}
                        onChange={() => toggleType(type)}
                        data-cy={`permit-assets-type-filter-${type}`}
                      >
                        {typeName(type)}
                      </Checkbox>
                    </PopupMenu.Item>
                  ))}
                </PopupMenu.Items>
              </PopupMenu.Panel>
            </PopupMenu>
          </div>
        </div>
        <div className="min-w-fit">
          <Checkbox
            data-cy="permit-assets-active-only"
            checked={activeOnly}
            onChange={() => setQuery((current) => ({ ...current, activeOnly: !current.activeOnly, page: 0 }))}
          >
            {t('common:customer.list.permits.activeOnly')}
          </Checkbox>
        </div>
      </div>
      {types.length > 0 && (
        <div className="flex gap-8 flex-wrap justify-start" data-cy="permit-assets-type-tags">
          {types.map((type) => (
            <Chip
              key={type}
              aria-label={t('common:customer.list.permits.removeType', { name: typeName(type) })}
              onClick={() => toggleType(type)}
            >
              {typeName(type)}
            </Chip>
          ))}
        </div>
      )}
      {lookup.status === 'loading' ? (
        <Spinner size={4} aria-label={t('common:customer.list.permits.loading')} />
      ) : (
        <Table data-cy="permit-assets-table" scrollable>
          {lookup.status === 'error' ? (
            <caption className="my-32">{t('common:customer.list.permits.error')}</caption>
          ) : permits.length === 0 ? (
            <caption className="my-32">{t('common:customer.list.permits.empty')}</caption>
          ) : (
            <>
              <Table.Header>
                {headers.map((header) => (
                  <Table.HeaderColumn key={header}>
                    {t(`common:customer.list.permits.headers.${header}`)}
                  </Table.HeaderColumn>
                ))}
              </Table.Header>
              <Table.Body>
                {permits.map((permit) => (
                  <Table.Row
                    key={permit.asset.id}
                    tabIndex={0}
                    role="button"
                    aria-label={t('common:customer.list.permits.open', { name: permit.permitHolder?.name ?? '' })}
                    onKeyDown={(e: KeyboardEvent) => (e.key === 'Enter' ? openCustomer(permit) : null)}
                    onClick={() => openCustomer(permit)}
                    className="cursor-pointer"
                  >
                    <Table.Column className="font-bold">{permit.permitHolder?.name}</Table.Column>
                    <Table.Column>
                      {permit.permitHolder?.organizationNumber &&
                        formatOrganizationNumber(permit.permitHolder.organizationNumber)}
                    </Table.Column>
                    <Table.Column>{permit.premises?.name}</Table.Column>
                    <Table.Column>
                      {permit.asset.type &&
                        t(
                          `common:customer.list.permits.types.${permit.asset.type}`,
                          permit.asset.title ?? permit.asset.type
                        )}
                    </Table.Column>
                    <Table.Column>{formatAddress(permit.premises?.address)}</Table.Column>
                    <Table.Column>{permit.registrationNumber}</Table.Column>
                    <Table.Column>{permit.validFrom}</Table.Column>
                    <Table.Column>
                      <AssetStatusLabel status={permit.asset.status} />
                    </Table.Column>
                  </Table.Row>
                ))}
              </Table.Body>
            </>
          )}
          {lookup.status === 'done' && totalPages > 1 && (
            <Table.Footer>
              <div className="sk-table-paginationwrapper">
                <Pagination
                  showFirst
                  showLast
                  pagesBefore={1}
                  pagesAfter={1}
                  showConstantPages={true}
                  fitContainer
                  pages={totalPages}
                  activePage={page + 1}
                  changePage={(newPage) => setPage(newPage - 1)}
                />
              </div>
            </Table.Footer>
          )}
        </Table>
      )}
    </div>
  );
};
