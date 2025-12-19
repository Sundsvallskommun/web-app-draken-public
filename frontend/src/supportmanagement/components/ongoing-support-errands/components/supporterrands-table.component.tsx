import { isKC } from '@common/services/application-service';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { Input, Pagination, Select, Spinner, Table } from '@sk-web-gui/react';
import { SortMode } from '@sk-web-gui/table';
import { useSupportErrandTable } from '@supportmanagement/components/support-errand/useSupportErrandTable';
import { Status, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { globalAcknowledgeSupportNotification } from '@supportmanagement/services/support-notification-service';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { TableForm } from '../ongoing-support-errands.component';

export const SupportErrandsTable: React.FC = () => {
  const { watch, setValue, register } = useFormContext<TableForm>();
  const { supportErrands: data, municipalityId, selectedSupportErrandStatuses }: AppContextInterface = useAppContext();
  const [rowHeight, setRowHeight] = useState<string>('normal');
  const sortOrder = watch('sortOrder');
  const sortColumn = watch('sortColumn');
  const totalPages = watch('totalPages');
  const page = watch('page');

  const currentStatusHaserrands =
    data.errands.filter((e) => {
      return selectedSupportErrandStatuses.includes(e.status) || e.status === Status.PENDING;
    }).length !== 0
      ? true
      : false;

  const sortOrders: { [key: string]: 'ascending' | 'descending' } = {
    asc: 'ascending',
    desc: 'descending',
  };

  const serverSideSortableColsKC: { [key: number]: string } = {
    0: 'status',
    1: 'touched',
    2: 'category',
    3: 'type',
    4: 'channel',
    5: 'created',
    6: 'priority',
    7: 'assignedUserId',
  };

  const serverSideSortableColsLOP: { [key: number]: string } =
    data.errands && (data.errands[0]?.status === Status.SUSPENDED || data.errands[0]?.status === Status.ASSIGNED)
      ? {
          0: 'status',
          1: 'touched',
          2: 'category',
          3: 'type',
          4: 'channel',
          5: 'created',
          6: 'priority',
          7: 'suspendedTo',
          8: 'assignedUserId',
        }
      : {
          0: 'status',
          1: 'touched',
          2: 'category',
          3: 'type',
          4: 'channel',
          5: 'created',
          6: 'priority',
          7: 'assignedUserId',
        };

  const handleSort = (index: number) => {
    if (isKC()) {
      if (sortColumn === serverSideSortableColsKC[index]) {
        setValue('sortOrder', sortOrder === 'desc' ? 'asc' : 'desc');
      } else {
        setValue('sortColumn', serverSideSortableColsKC[index]);
      }
    } else {
      if (sortColumn === serverSideSortableColsLOP[index]) {
        setValue('sortOrder', sortOrder === 'desc' ? 'asc' : 'desc');
      } else {
        setValue('sortColumn', serverSideSortableColsLOP[index]);
      }
    }
  };

  const openErrandeInNewWindow = async (errand: SupportErrand) => {
    if (errand.activeNotifications && errand.activeNotifications.length > 0) {
      await globalAcknowledgeSupportNotification(errand, municipalityId).catch(() => {
        throw new Error('Failed to acknowledge notification');
      });
    }
    window.open(`${process.env.NEXT_PUBLIC_BASEPATH}/arende/${municipalityId}/${errand.id}`, '_blank');
  };

  const errandTableObject = useSupportErrandTable(selectedSupportErrandStatuses);

  const headers = errandTableObject.map((column, index) => (
    <Table.HeaderColumn key={`header-${index}`} sticky={true}>
      {column.screenReaderOnly ? (
        <span className="sr-only">{column.label}</span>
      ) : column.sortable ? (
        <Table.SortButton
          isActive={
            isKC() ? sortColumn === serverSideSortableColsKC[index] : sortColumn === serverSideSortableColsLOP[index]
          }
          sortOrder={sortOrders[sortOrder] as SortMode}
          onClick={() => handleSort(index)}
        >
          {column.label}
        </Table.SortButton>
      ) : (
        column.label
      )}
    </Table.HeaderColumn>
  ));

  const rows = (data.errands || []).map((errand: SupportErrand, index) => {
    return (
      <Table.Row
        tabIndex={0}
        role="button"
        key={`row-${index}`}
        aria-label={`Ärende ${errand.errandNumber}, öppna ärende i ny flik`}
        onKeyDown={(e) => (e.key === 'Enter' ? openErrandeInNewWindow(errand) : null)}
        onClick={() => openErrandeInNewWindow(errand)}
        className="cursor-pointer"
      >
        {errandTableObject.map((column, index) => (
          <Table.Column key={`cell-${index}`}>{column?.render(errand)}</Table.Column>
        ))}
      </Table.Row>
    );
  });

  return (
    <div className="max-w-full relative">
      {(data.isLoading || (!currentStatusHaserrands && data.errands.length !== 0)) && (
        <div className="z-100 absolute bg-background-content opacity-50 w-full h-[50rem] flex items-center justify-center">
          <div>
            <Spinner size={5} />
          </div>
        </div>
      )}
      <Table data-cy="main-table" dense={rowHeight === 'dense'} aria-describedby="errandTableCaption" scrollable>
        {(!data.isLoading && rows && data.errands.length === 0) || data.error === '404' ? (
          <caption id="errandTableCaption" className="my-32">
            Det finns inga ärenden
          </caption>
        ) : data.error ? (
          <caption id="errandTableCaption" className="my-32">
            Det gick inte att hämta ärenden {data.error}
          </caption>
        ) : (
          page && (
            <caption id="errandTableCaption" className="sr-only">
              Ärenden, sida {page + 1} av {totalPages}
            </caption>
          )
        )}
        {data.errands.length > 0 && currentStatusHaserrands && (
          <>
            <Table.Header>{headers}</Table.Header>
            <Table.Body>{rows}</Table.Body>
          </>
        )}

        {currentStatusHaserrands && (
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
