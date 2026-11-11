'use client';

import { formatOrganizationNumber, getCustomerIdFromErrand } from '@common/services/customer-service';
import { Pagination, Spinner, Table } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import { TableForm } from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands.component';
import {
  isOrganizationExternalIdType,
  SupportErrand,
  SupportStakeholderFormModel,
} from '@supportmanagement/services/support-errand-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import { useRouter } from 'next/navigation';
import { FC, KeyboardEvent, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

interface CustomerRow {
  customerId: string;
  stakeholder: SupportStakeholderFormModel;
}

// One row per customer; errands without a PRIMARY stakeholder have no customer and drop out.
const toCustomerRows = (errands: SupportErrand[]): CustomerRow[] => {
  const rows = new Map<string, CustomerRow>();
  errands.forEach((errand) => {
    const customerId = getCustomerIdFromErrand(errand);
    const stakeholder = getSupportOwnerStakeholder(errand);
    if (customerId && stakeholder && !rows.has(customerId)) {
      rows.set(customerId, { customerId, stakeholder });
    }
  });
  return Array.from(rows.values());
};

// The customer view only knows organisations so far, so a person is listed but cannot be opened.
const isOrganization = ({ externalIdType }: SupportStakeholderFormModel): boolean =>
  isOrganizationExternalIdType(externalIdType);

const customerName = (stakeholder: SupportStakeholderFormModel): string =>
  isOrganization(stakeholder)
    ? stakeholder.organizationName ?? `(Organisation ${stakeholder.externalId})`
    : [stakeholder.firstName, stakeholder.lastName].filter(Boolean).join(' ');

const formatAddress = ({ address, zipCode, city }: SupportStakeholderFormModel): string =>
  [address, [zipCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

const headers = ['Kund', 'Organisationsnummer', 'Adress', 'E-post', 'Telefon'];

/**
 * Customers (PRIMARY stakeholders) of the errands in the support store.
 * Pages through errands, so a page can show fewer rows than its size and a customer can recur on another page.
 */
export const SupportStakeholdersTable: FC = () => {
  const { watch, setValue } = useFormContext<TableForm>();
  const data = useSupportStore((s) => s.supportErrands);
  const router = useRouter();
  const page = watch('page');
  const totalPages = watch('totalPages');
  const rows = useMemo(() => toCustomerRows(data.errands ?? []), [data.errands]);

  const openCustomer = (customerId: string) => router.push(`/kundbild/${customerId}`);

  if (data.isLoading) {
    return <Spinner size={4} aria-label="Hämtar kunder" />;
  }

  return (
    <Table data-cy="stakeholders-table" scrollable>
      {data.error ? (
        <caption className="my-32">Det gick inte att hämta kunder {data.error}</caption>
      ) : rows.length === 0 ? (
        <caption className="my-32">Det finns inga kunder på den här sidan</caption>
      ) : (
        <>
          <Table.Header>
            {headers.map((header) => (
              <Table.HeaderColumn key={header}>{header}</Table.HeaderColumn>
            ))}
          </Table.Header>
          <Table.Body>
            {rows.map(({ customerId, stakeholder }) => (
              <Table.Row
                key={customerId}
                {...(isOrganization(stakeholder) && {
                  tabIndex: 0,
                  role: 'button',
                  'aria-label': `Öppna kund ${customerName(stakeholder)}`,
                  onKeyDown: (e: KeyboardEvent) => (e.key === 'Enter' ? openCustomer(customerId) : null),
                  onClick: () => openCustomer(customerId),
                  className: 'cursor-pointer',
                })}
              >
                <Table.Column className="font-bold">{customerName(stakeholder)}</Table.Column>
                <Table.Column>
                  {isOrganization(stakeholder)
                    ? stakeholder.organizationNumber && formatOrganizationNumber(stakeholder.organizationNumber)
                    : 'Privatperson'}
                </Table.Column>
                <Table.Column>{formatAddress(stakeholder)}</Table.Column>
                <Table.Column>{stakeholder.emails[0]?.value}</Table.Column>
                <Table.Column>{stakeholder.phoneNumbers[0]?.value}</Table.Column>
              </Table.Row>
            ))}
          </Table.Body>
        </>
      )}
      {!data.error && totalPages > 1 && (
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
              changePage={(newPage) => setValue('page', newPage - 1)}
            />
          </div>
        </Table.Footer>
      )}
    </Table>
  );
};
