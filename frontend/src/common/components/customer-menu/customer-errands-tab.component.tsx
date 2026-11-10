'use client';

import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';
import { findOperationUsingNamespace } from '@common/services/casestatus-service';
import {
  Customer,
  CustomerErrandsPage,
  getCustomerCaseStatuses,
  isOtherDrakeCase,
} from '@common/services/customer-service';
import { Pagination, Spinner, Table } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useUserStore } from '@stores/index';
import { SupportStatusLabelComponent } from '@supportmanagement/components/ongoing-support-errands/components/support-status-label.component';
import {
  Channels,
  getLabelCategorizationHeading,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getAdminName } from '@supportmanagement/services/support-stakeholder-service';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { lookupContent, OverviewSection } from './customer-overview.component';
import { type CustomerData, useCustomerLookup } from './use-customer-lookup';

const Intro: FC<{ text: string }> = ({ text }) => <p className="m-0 max-w-[70rem]">{text}</p>;

const EmptyText: FC<{ text: string; dataCy?: string }> = ({ text, dataCy }) => (
  <p className="m-0 text-small italic text-dark-secondary" data-cy={dataCy}>
    {text}
  </p>
);

export const openErrand = (errandNumber?: string) =>
  window.open(`${process.env.NEXT_PUBLIC_BASEPATH}/arende/${errandNumber}`, '_blank');

const OwnErrandsTable: FC<{
  errands: CustomerErrandsPage;
  page: number;
  changePage: (page: number) => void;
}> = ({ errands: { errands, totalPages }, page, changePage }) => {
  const { t } = useTranslation();
  const metadata = useMetadataStore((s) => s.supportMetadata);
  const administrators = useUserStore((s) => s.administrators);
  const adminName = (errand: SupportErrand) => {
    const admin = administrators?.find((a) => a?.adAccount === errand.assignedUserId);
    return admin ? getAdminName(admin) : '–';
  };

  return (
    <Table dense background aria-label={t('common:customer.errands.own.title')} data-cy="customer-errands-own">
      <Table.Header>
        <Table.HeaderColumn>{t('common:customer.errands.columns.status')}</Table.HeaderColumn>
        <Table.HeaderColumn>{t('common:customer.errands.columns.errandNumber')}</Table.HeaderColumn>
        <Table.HeaderColumn>{t('common:customer.errands.columns.errandType')}</Table.HeaderColumn>
        <Table.HeaderColumn>{t('common:customer.errands.columns.channel')}</Table.HeaderColumn>
        <Table.HeaderColumn>{t('common:customer.errands.columns.administrator')}</Table.HeaderColumn>
      </Table.Header>
      <Table.Body>
        {errands.map((errand) => (
          <Table.Row
            key={errand.id}
            tabIndex={0}
            role="button"
            aria-label={t('common:customer.errands.own.openRow', { errandNumber: errand.errandNumber })}
            onKeyDown={(e) => (e.key === 'Enter' ? openErrand(errand.errandNumber) : null)}
            onClick={() => openErrand(errand.errandNumber)}
            className="cursor-pointer"
          >
            <Table.Column>
              <SupportStatusLabelComponent
                status={errand.status ?? ''}
                resolution={errand.resolution ?? ''}
                actions={errand.actions ?? []}
              />
            </Table.Column>
            <Table.Column className="font-bold">{errand.errandNumber}</Table.Column>
            <Table.Column>{getLabelCategorizationHeading(errand, metadata)}</Table.Column>
            <Table.Column>{(Channels as Record<string, string>)[errand.channel ?? ''] ?? '–'}</Table.Column>
            <Table.Column>{adminName(errand)}</Table.Column>
          </Table.Row>
        ))}
      </Table.Body>
      {totalPages > 1 && (
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
              changePage={(newPage) => changePage(newPage - 1)}
            />
          </div>
        </Table.Footer>
      )}
    </Table>
  );
};

const OtherDrakeErrands: FC<{ customer: Customer }> = ({ customer }) => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const namespace = useMetadataStore((s) => s.supportMetadata?.namespace);
  const { customerId, organizationNumber } = customer;
  const statuses = useCustomerLookup(
    `${municipalityId}|${customerId}`,
    municipalityId ? () => getCustomerCaseStatuses(municipalityId, organizationNumber) : undefined
  );

  // Casestatus can take a long time, so the wait is spelled out rather than only spinning.
  if (statuses.status === 'loading' || !namespace) {
    return (
      <div className="flex items-center gap-8" data-cy="customer-errands-other-loading">
        <Spinner size={3} aria-label={t('common:customer.errands.other.loading')} />
        <span className="text-small text-dark-secondary">{t('common:customer.errands.other.loading')}</span>
      </div>
    );
  }

  return lookupContent(statuses, t('common:customer.errands.other.error'), (data) => {
    const others = data.filter((status) => isOtherDrakeCase(status, namespace));
    return others.length === 0 ? (
      <EmptyText text={t('common:customer.errands.other.empty')} dataCy="customer-errands-other-empty" />
    ) : (
      <Table dense background aria-label={t('common:customer.errands.other.title')} data-cy="customer-errands-other">
        <Table.Header>
          <Table.HeaderColumn>{t('common:customer.errands.columns.status')}</Table.HeaderColumn>
          <Table.HeaderColumn>{t('common:customer.errands.columns.errandNumber')}</Table.HeaderColumn>
          <Table.HeaderColumn>{t('common:customer.errands.columns.errandType')}</Table.HeaderColumn>
          <Table.HeaderColumn>{t('common:customer.errands.columns.drake')}</Table.HeaderColumn>
        </Table.Header>
        <Table.Body>
          {others.map((status) => (
            <Table.Row key={status.caseId ?? status.errandNumber}>
              <Table.Column>
                <CaseStatusLabelComponent externalStatus={status.externalStatus ?? ''} />
              </Table.Column>
              <Table.Column className="font-bold">{status.errandNumber ?? '–'}</Table.Column>
              <Table.Column>{status.caseType ?? '–'}</Table.Column>
              <Table.Column>{findOperationUsingNamespace(status.namespace ?? '')}</Table.Column>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    );
  });
};

/** Ärenden tab of the customer view. */
export const CustomerErrandsTab: FC<{ data: CustomerData }> = ({ data: { errands, errandsPage, setErrandsPage } }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-32" data-cy="customer-errands-tab">
      <OverviewSection title={t('common:customer.errands.own.title')} dataCy="customer-errands-own-section">
        <Intro text={t('common:customer.errands.own.intro')} />
        {lookupContent(errands, t('common:customer.errands.own.error'), (data) =>
          data.errands.length === 0 ? (
            <EmptyText text={t('common:customer.errands.own.empty')} dataCy="customer-errands-own-empty" />
          ) : (
            <OwnErrandsTable errands={data} page={errandsPage} changePage={setErrandsPage} />
          )
        )}
      </OverviewSection>

      <OverviewSection title={t('common:customer.errands.other.title')} dataCy="customer-errands-other-section">
        <Intro text={t('common:customer.errands.other.intro')} />
        <EmptyText text={t('common:customer.errands.other.deferred')} dataCy="customer-errands-other-deferred" />
        {/* <OtherDrakeErrands customer={customer} /> */}
      </OverviewSection>

      <OverviewSection title={t('common:customer.errands.external.title')} dataCy="customer-errands-external-section">
        <Intro text={t('common:customer.errands.external.intro')} />
        <EmptyText text={t('common:customer.errands.external.deferred')} dataCy="customer-errands-external-deferred" />
      </OverviewSection>
    </div>
  );
};
