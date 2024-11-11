import { useAppContext } from '@contexts/app.context';
import { useMediaQuery } from '@mui/material';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Input, Pagination, Select, Table, useGui } from '@sk-web-gui/react';
import { SortMode } from '@sk-web-gui/table';
import {
  SupportErrandsData,
  attestationLabels,
  findAttestationStatusLabelForAttestationStatusKey,
} from '@supportmanagement/services/support-errand-service';
import NextLink from 'next/link';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface AttestationTableForm {
  sortOrder: 'asc' | 'desc';
  sortColumn: string;
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

const attestationData = [
  {
    id: '1',
    type: 'Extra utbetalning - Systemet',
    quantity: '1',
    amount: '500 sek',
    totalAmount: '500 sek',
    supervisor: 'Sandra Eriksson',
    registeredBy: 'Emma Eriksson',
    registeredAt: '2024-01-01 12.00',
    updatedAt: '2024-01-01 13.00',
    errandId: '1234-55567',
    attested: '2024-01-01 12.00',
    status: 'APPROVED',
    referenceNumber: '111',
    approvedBy: 'Sandra Eriksson',
    approved: '2024-01-01 12.00',
  },
  {
    id: '2',
    type: 'Extra utbetalning - Direktinsättning',
    quantity: '2',
    amount: '1500 sek',
    totalAmount: '3000 sek',
    supervisor: 'Sandra Eriksson',
    registeredBy: 'Emma Eriksson',
    registeredAt: '2024-01-01 12.00',
    updatedAt: '2024-01-01 14.00',
    errandId: '1234-55568',
    attested: '2024-01-01 12.00',
    status: 'DENIED',
    referenceNumber: '222',
    approvedBy: 'Sandra Eriksson',
    approved: '2024-01-01 12.00',
  },
  {
    id: '3',
    type: 'Extra utbetalning - Direktinsättning',
    quantity: '3',
    amount: '300 sek',
    totalAmount: '900 sek',
    supervisor: 'Sandra Larsson',
    registeredBy: 'Emma Larsson',
    registeredAt: '2024-01-01 12.00',
    updatedAt: '2024-01-01 15.00',
    errandId: '1234-55569',
    attested: '',
    status: 'NONE',
    referenceNumber: '333',
  },
];

export const AttestationsTable: React.FC<{
  setSelectedInvoice;
  setShowSelectedInvoice;
}> = ({ setSelectedInvoice, setShowSelectedInvoice }) => {
  const { watch, setValue, register } = useFormContext<AttestationTableForm>();
  const {
    supportErrands: data,
    municipalityId,
  }: {
    supportErrands: SupportErrandsData;
    supportAdmins;
    setSupportAdmins;
    municipalityId;
    setSidebarButtons;
  } = useAppContext();
  const [rowHeight, setRowHeight] = useState<string>('normal');
  const sortOrder = watch('sortOrder');
  const sortColumn = watch('sortColumn');
  const pageSize = watch('pageSize');
  const totalPages = watch('totalPages');
  const page = watch('page');

  const { theme } = useGui();
  const isMobile = useMediaQuery(`screen and (max-width: ${theme.screens.md})`);

  const sortOrders: { [key: string]: 'ascending' | 'descending' } = {
    asc: 'ascending',
    desc: 'descending',
  };

  const serverSideSortableCols: { [key: number]: string } = {
    0: 'type',
    1: 'hours',
    2: 'amount',
    3: 'supervisor',
    4: 'registeredAt',
    5: 'updatedAt',
    6: 'errandId',
    7: 'attested',
    8: 'status',
  };

  const handleSort = (index: number) => {
    if (sortColumn === serverSideSortableCols[index]) {
      setValue('sortOrder', sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setValue('sortColumn', serverSideSortableCols[index]);
    }
  };

  const headers = attestationLabels.map((header, index) => (
    <Table.HeaderColumn key={`header-${index}`} sticky={true}>
      {header.screenReaderOnly ? (
        <span className="sr-only">{header.label}</span>
      ) : header.sortable ? (
        <Table.SortButton
          isActive={sortColumn === serverSideSortableCols[index]}
          sortOrder={sortOrders[sortOrder] as SortMode}
          onClick={() => handleSort(index)}
        >
          {header.label}
        </Table.SortButton>
      ) : (
        header.label
      )}
    </Table.HeaderColumn>
  ));

  const StatusButtonComponent = (invoice) => {
    let color,
      inverted = false,
      icon = null,
      variant = null;
    switch (invoice.status) {
      case 'APPROVED':
        color = 'gronsta';
        inverted = true;
        icon = 'check';
        variant = 'primary';
        break;
      case 'DENIED':
        color = 'error';
        icon = 'thumbs-down';
        variant = 'primary';
        inverted = true;
        break;
      case 'NONE':
        color = 'tertiary';
        variant = 'secondary';
        break;
      default:
        color = 'tertiary';
        break;
    }
    return (
      <Button
        variant={variant}
        inverted={inverted}
        color={color}
        size="sm"
        className="w-full"
        onClick={() => {
          setSelectedInvoice(invoice);
          setShowSelectedInvoice(true);
        }}
      >
        {icon ? <LucideIcon name={icon} size={16} /> : null}{' '}
        {findAttestationStatusLabelForAttestationStatusKey(invoice.status)}
      </Button>
    );
  };

  const rows = (attestationData || []).map((invoice: any, index) => {
    return (
      <Table.Row key={`row-${index}`}>
        <Table.HeaderColumn
          scope="row"
          className="w-[275px] whitespace-nowrap overflow-hidden text-ellipsis table-caption"
        >
          {invoice.type}
        </Table.HeaderColumn>
        <Table.Column>{invoice.quantity}</Table.Column>
        <Table.Column>{invoice.amount}</Table.Column>
        <Table.Column>{invoice.supervisor}</Table.Column>
        <Table.Column>{invoice.registeredAt}</Table.Column>
        <Table.Column>{invoice.updatedAt}</Table.Column>
        <Table.Column>
          <NextLink href={`/arende/${municipalityId}/${invoice.errandId}`} target="_blank" className="underline">
            {invoice.errandId}
          </NextLink>
        </Table.Column>
        <Table.Column>{invoice.attested}</Table.Column>
        <Table.Column sticky>{StatusButtonComponent(invoice)}</Table.Column>
      </Table.Row>
    );
  });

  return (
    <div className="max-w-full relative">
      {/* TODO {(data.isLoading || (!currentStatusHaserrands && data.errands.length !== 0)) && (
        <div className="z-100 absolute bg-background-content opacity-50 w-full h-[50rem] flex items-center justify-center">
          <div>
            <Spinner size={5} />
          </div>
        </div>
      )}*/}
      <Table data-cy="main-table" dense={rowHeight === 'dense'} aria-describedby="errandTableCaption" scrollable>
        {/* TODO {(!data.isLoading && rows && data.errands.length === 0) || data.error === '404' ? (
          <caption id="errandTableCaption" className="my-32">
            Det finns inga fakturor
          </caption>
        ) : data.error ? (
          <caption id="errandTableCaption" className="my-32">
            Det gick inte att hämta fakturor {data.error}
          </caption>
        ) : (
          page && (
            <caption id="errandTableCaption" className="sr-only">
              Fakturor, sida {page + 1} av {totalPages}
            </caption>
          )
        )}*/}
        {attestationData.length > 0 && (
          <>
            <Table.Header>{headers}</Table.Header>
            <Table.Body>{rows}</Table.Body>
          </>
        )}

        {attestationData?.length > 0 && (
          <Table.Footer>
            <div className="sk-table-bottom-section sk-table-pagination-mobile">
              <label className="sk-table-bottom-section-label" htmlFor="paginationSelect">
                Sida:
              </label>
              <Select
                id="paginationSelect"
                size="sm"
                variant="tertiary"
                value={(page || 0).toString()}
                onSelectValue={(value) => setValue('page', parseInt(value, 10))}
              >
                {totalPages &&
                  Array.from(Array(totalPages).keys()).map((page) => (
                    <Select.Option key={`pagipage-${page}`} value={page}>
                      {page + 1}
                    </Select.Option>
                  ))}
              </Select>
            </div>
            <div className="sk-table-bottom-section">
              <label className="sk-table-bottom-section-label" htmlFor="pageSize">
                Rader per sida:
              </label>
              <Input
                {...register('pageSize')}
                size="sm"
                id="pageSize"
                type="number"
                min={1}
                max={1000}
                className="max-w-[6rem]"
              />
            </div>
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
                changePage={(page) => {
                  setValue('page', page - 1);
                }}
              />
            </div>
            <div className="sk-table-bottom-section">
              <label className="sk-table-bottom-section-label" htmlFor="rowHeight">
                Radhöjd:
              </label>
              <Select
                size="sm"
                id="rowHeight"
                variant="tertiary"
                onChange={(e) => setRowHeight(e.target.value)}
                value={rowHeight}
              >
                <Select.Option value="normal">Normal</Select.Option>
                <Select.Option value="dense">Tät</Select.Option>
              </Select>
            </div>
          </Table.Footer>
        )}
      </Table>
    </div>
  );
};
