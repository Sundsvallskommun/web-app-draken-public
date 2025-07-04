import { formatCurrency, prettyTime } from '@common/services/helper-service';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Input, Pagination, Select, Table } from '@sk-web-gui/react';
import { SortMode } from '@sk-web-gui/table';
import { attestationLabels, billingrecordStatusToLabel } from '@supportmanagement/services/support-billing-service';
import { findAttestationStatusLabelForAttestationStatusKey } from '@supportmanagement/services/support-errand-service';
import NextLink from 'next/link';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CBillingRecord, CBillingRecordStatusEnum } from 'src/data-contracts/backend/data-contracts';

export interface AttestationTableForm {
  sortOrder: 'asc' | 'desc';
  sortColumn: string;
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

export const AttestationsTable: React.FC<{
  setSelectedRecord;
  setShowSelectedRecord;
}> = ({ setSelectedRecord, setShowSelectedRecord }) => {
  const { watch, setValue, register } = useFormContext<AttestationTableForm>();
  const { municipalityId, billingRecords }: AppContextInterface = useAppContext();
  const [rowHeight, setRowHeight] = useState<string>('normal');
  const sortOrder = watch('sortOrder');
  const sortColumn = watch('sortColumn');
  const pageSize = watch('pageSize');
  const totalPages = watch('totalPages');
  const page = watch('page');

  const sortOrders: { [key: string]: 'ascending' | 'descending' } = {
    asc: 'ascending',
    desc: 'descending',
  };

  const serverSideSortableCols: { [key: number]: string } = {
    0: 'invoice.description',
    1: 'invoice.invoiceRows.quantity',
    2: 'invoice.totalAmount',
    3: 'supervisor',
    4: 'created',
    5: 'modified',
    6: 'errandId',
    7: 'approved',
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

  const StatusButtonComponent = (record) => {
    let color,
      inverted = false,
      icon = null,
      variant = null;
    switch (record.status) {
      case CBillingRecordStatusEnum.APPROVED:
        color = 'gronsta';
        inverted = true;
        icon = 'check';
        variant = 'primary';
        break;
      case CBillingRecordStatusEnum.REJECTED:
        color = 'error';
        icon = 'thumbs-down';
        variant = 'primary';
        inverted = true;
        break;
      case CBillingRecordStatusEnum.NEW:
        color = 'tertiary';
        icon = 'eye';
        variant = 'secondary';
        break;
      case CBillingRecordStatusEnum.INVOICED:
        color = 'vattjom';
        inverted = true;
        icon = 'check';
        variant = 'primary';
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
          setSelectedRecord(record);
          setShowSelectedRecord(true);
        }}
      >
        {icon ? <LucideIcon name={icon} size={16} /> : null}{' '}
        {findAttestationStatusLabelForAttestationStatusKey(record.status)}
      </Button>
    );
  };

  const maybe: (s: any) => string = (s) => (s ? s : '(saknas)');

  const rows = (billingRecords?.content || []).map((record: CBillingRecord, index) => {
    return (
      <Table.Row key={`row-${index}`}>
        <Table.HeaderColumn
          scope="row"
          className="w-[275px] whitespace-nowrap overflow-hidden text-ellipsis table-caption"
        >
          {maybe(record?.invoice?.description)}
        </Table.HeaderColumn>
        <Table.Column>{maybe(record?.invoice.invoiceRows?.[0]?.quantity)}</Table.Column>
        <Table.Column>{formatCurrency(maybe(record.invoice?.totalAmount))}</Table.Column>
        <Table.Column>{maybe(record.extraParameters?.['referenceName'])}</Table.Column>
        <Table.Column>{prettyTime(record.created)}</Table.Column>
        <Table.Column>{prettyTime(record.modified)}</Table.Column>
        <Table.Column>
          {record.extraParameters?.['errandId'] ? (
            <NextLink
              href={`/arende/${municipalityId}/${record.extraParameters?.['errandId']}`}
              target="_blank"
              className="underline"
            >
              {maybe(record.extraParameters?.['errandNumber'])}
            </NextLink>
          ) : (
            maybe(record.extraParameters?.['errandNumber'])
          )}
        </Table.Column>
        <Table.Column>{prettyTime(record.approved)}</Table.Column>
        <Table.Column>{billingrecordStatusToLabel(record.status)}</Table.Column>
        <Table.Column sticky>{StatusButtonComponent(record)}</Table.Column>
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
        {billingRecords?.numberOfElements > 0 && (
          <>
            <Table.Header>{headers}</Table.Header>
            <Table.Body>{rows}</Table.Body>
          </>
        )}

        {billingRecords?.numberOfElements > 0 && (
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
                onSelectValue={(value) => {
                  setValue('page', parseInt(value, 10));
                }}
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
