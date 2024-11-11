import { Priority } from '@casedata/interfaces/priority';
import { Category } from '@common/data-contracts/supportmanagement/data-contracts';
import { isIS, isKC, isLOP } from '@common/services/application-service';
import { prettyTime } from '@common/services/helper-service';
import { useAppContext } from '@contexts/app.context';
import { useMediaQuery } from '@mui/material';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Input, Label, Pagination, Select, Spinner, Table, useGui } from '@sk-web-gui/react';
import { SortMode } from '@sk-web-gui/table';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import {
  Channels,
  Resolution,
  Status,
  StatusLabel,
  SupportErrand,
  SupportErrandsData,
  getLabelCategory,
  getLabelSubType,
  getLabelType,
  getOngoingSupportErrandLabels,
} from '@supportmanagement/services/support-errand-service';
import { getAdminName } from '@supportmanagement/services/support-stakeholder-service';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { TableForm } from '../ongoing-support-errands.component';
import { SidebarButton } from '@common/interfaces/sidebar-button';

export const SupportErrandsTable: React.FC = () => {
  const { watch, setValue, register } = useFormContext<TableForm>();
  const {
    supportErrands: data,
    supportMetadata,
    supportAdmins,
    municipalityId,
    selectedSupportErrandStatuses,
    setSidebarButtons,
    newSupportErrands,
    ongoingSupportErrands,
    suspendedSupportErrands,
    solvedSupportErrands,
  }: {
    supportErrands: SupportErrandsData;
    supportMetadata;
    supportAdmins;
    setSupportAdmins;
    municipalityId;
    selectedSupportErrandStatuses;
    setSidebarButtons;
    newSupportErrands;
    ongoingSupportErrands;
    suspendedSupportErrands;
    solvedSupportErrands;
  } = useAppContext();
  const [rowHeight, setRowHeight] = useState<string>('normal');
  const sortOrder = watch('sortOrder');
  const sortColumn = watch('sortColumn');
  const pageSize = watch('pageSize');
  const totalPages = watch('totalPages');
  const page = watch('page');
  const [categories, setCategories] = useState<Category[]>();

  const { theme } = useGui();
  const isMobile = useMediaQuery(`screen and (max-width: ${theme.screens.md})`);
  const currentStatusHaserrands =
    data.errands.filter((e) => {
      return selectedSupportErrandStatuses.includes(e.status) || e.status === Status.PENDING;
    }).length !== 0
      ? true
      : false;

  const supportSidebarButtons: SidebarButton[] = [
    {
      label: 'Nya ärenden',
      key: Status.NEW,
      statuses: [Status.NEW],
      icon: 'inbox',
      totalStatusErrands: newSupportErrands.totalElements,
    },
    {
      label: 'Öppnade ärenden',
      key: Status.ONGOING,
      statuses: [Status.ONGOING, Status.PENDING, Status.AWAITING_INTERNAL_RESPONSE],
      icon: 'clipboard-pen',
      totalStatusErrands: ongoingSupportErrands.totalElements,
    },
    {
      label: 'Parkerade ärenden',
      key: Status.SUSPENDED,
      statuses: [Status.SUSPENDED, Status.ASSIGNED],
      icon: 'circle-pause',
      totalStatusErrands: suspendedSupportErrands.totalElements,
    },
    {
      label: 'Avslutade ärenden',
      key: Status.SOLVED,
      statuses: [Status.SOLVED],
      icon: 'circle-check-big',
      totalStatusErrands: solvedSupportErrands.totalElements,
    },
  ];

  useEffect(() => {
    setSidebarButtons(supportSidebarButtons);
  }, [data, newSupportErrands, ongoingSupportErrands, suspendedSupportErrands, solvedSupportErrands]);

  useEffect(() => {
    setCategories(supportMetadata?.categories);
  }, [supportMetadata]);

  const sortOrders: { [key: string]: 'ascending' | 'descending' } = {
    asc: 'ascending',
    desc: 'descending',
  };

  const serverSideSortableColsKC: { [key: number]: string } = {
    0: 'status',
    1: 'category',
    2: 'type',
    3: 'created',
    4: 'touched',
    5: 'priority',
    6: 'channel',
    7: 'assignedUserId',
  };

  const serverSideSortableColsLOP: { [key: number]: string } =
    data.errands && (data.errands[0]?.status === Status.SUSPENDED || data.errands[0]?.status === Status.ASSIGNED)
      ? {
          0: 'status',
          1: 'category',
          2: 'type',
          3: 'subType',
          4: 'channel',
          5: 'created',
          6: 'touched',
          7: 'suspendedTo',
          8: 'assignedUserId',
        }
      : {
          0: 'status',
          1: 'category',
          2: 'type',
          3: 'subType',
          4: 'channel',
          5: 'created',
          6: 'touched',
          7: 'priority',
          8: 'assignedUserId',
        };

  const handleSort = (index: number) => {
    if (isKC() || isIS()) {
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

  const openErrandeInNewWindow = (errandId: string) => {
    window.open(`${process.env.NEXT_PUBLIC_BASEPATH}/arende/${municipalityId}/${errandId}`, '_blank');
  };

  const headers = getOngoingSupportErrandLabels(selectedSupportErrandStatuses).map((header, index) => (
    <Table.HeaderColumn key={`header-${index}`} sticky={true}>
      {header.screenReaderOnly ? (
        <span className="sr-only">{header.label}</span>
      ) : header.sortable ? (
        <Table.SortButton
          isActive={
            isKC() || isIS()
              ? sortColumn === serverSideSortableColsKC[index]
              : sortColumn === serverSideSortableColsLOP[index]
          }
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

  const StatusLabelComponent = (status: string, resolution: string) => {
    const solvedErrandIcon = () => {
      if (resolution === Resolution.REGISTERED_EXTERNAL_SYSTEM) return 'split';
      else if (resolution === Resolution.CLOSED) return 'check';
      else if (resolution === Resolution.BACK_TO_MANAGER) return 'redo';
      else if (resolution === Resolution.BACK_TO_HR) return 'redo';
      else if (status === 'SOLVED') return 'check';
    };
    let color,
      inverted = false,
      icon = null;
    switch (status) {
      case 'SOLVED':
        color = 'primary';
        icon = solvedErrandIcon();
        break;
      case 'ONGOING':
        color = 'gronsta';
        icon = 'pen';
        break;
      case 'NEW':
        color = 'vattjom';
        break;
      case 'PENDING':
        color = 'gronsta';
        inverted = true;
        icon = 'clock-10';
        break;
      case 'AWAITING_INTERNAL_RESPONSE':
        color = 'gronsta';
        inverted = true;
        icon = 'clock-10';
        break;
      case 'SUSPENDED':
        color = 'warning';
        inverted = true;
        icon = 'circle-pause';
        break;
      case 'ASSIGNED':
        color = 'warning';
        inverted = false;
        icon = 'circle-pause';
        break;
      default:
        color = 'tertiary';
        break;
    }

    const solvedErrandText = () => {
      if (resolution === Resolution.REGISTERED_EXTERNAL_SYSTEM && status === Status.SOLVED) return 'Eskalerat';
      else if (resolution === Resolution.CLOSED && status === Status.SOLVED) return 'Avslutat';
      else if (resolution === Resolution.BACK_TO_MANAGER && status === Status.SOLVED) return 'Åter till chef';
      else if (resolution === Resolution.BACK_TO_HR && status === Status.SOLVED) return 'Åter till HR';
      else return StatusLabel[status];
    };
    return (
      <Label rounded inverted={inverted} color={color} className={`max-h-full h-auto text-center whitespace-nowrap`}>
        {icon ? <LucideIcon name={icon} size={16} /> : null} {solvedErrandText()}
      </Label>
    );
  };

  const rows = (data.errands || []).map((errand: SupportErrand, index) => {
    return (
      <Table.Row
        tabIndex={0}
        role="button"
        key={`row-${index}`}
        aria-label={`Ärende ${errand.errandNumber}, öppna ärende i ny flik`}
        onKeyDown={(e) => (e.key === 'Enter' ? openErrandeInNewWindow(errand.id) : null)}
        onClick={() => openErrandeInNewWindow(errand.id)}
        className="cursor-pointer"
      >
        <Table.Column>{StatusLabelComponent(errand.status, errand.resolution)}</Table.Column>
        <Table.HeaderColumn
          scope="row"
          className="w-[200px] whitespace-nowrap overflow-hidden text-ellipsis table-caption"
        >
          {isKC() || isIS() || errand.labels.length < 1 ? (
            <div>{categories?.find((t) => t.name === errand.category)?.displayName || errand.category}</div>
          ) : isLOP() ? (
            <div>{getLabelCategory(errand, supportMetadata)?.displayName || ''}</div>
          ) : null}
          <div className="font-normal">{errand.errandNumber}</div>
        </Table.HeaderColumn>
        <Table.Column scope="row">
          <div className="max-w-[280px]">
            {isKC() || isIS() || errand.labels.length < 2 ? (
              <p className="m-0">
                {categories?.find((t) => t.name === errand.category)?.types.find((t) => t.name === errand.type)
                  ?.displayName || errand.type}
              </p>
            ) : isLOP() ? (
              <p className="m-0">{getLabelType(errand, supportMetadata)?.displayName || ''}</p>
            ) : null}
            <p className="m-0 italic truncate">{errand?.title !== 'Empty errand' ? errand?.title : null}</p>
          </div>
        </Table.Column>
        {isLOP() && (
          <Table.Column>
            <div className="max-w-[280px]">
              <p className="m-0">{getLabelSubType(errand, supportMetadata)?.displayName || ''}</p>
            </div>
          </Table.Column>
        )}
        {isLOP() && <Table.Column>{Channels[errand?.channel]}</Table.Column>}
        <Table.Column>
          <time dateTime={errand.created}>{dayjs(errand.created).format('YYYY-MM-DD, HH:mm')}</time>
        </Table.Column>
        <Table.Column>
          <time dateTime={errand.touched}>{prettyTime(errand.touched)}</time>
        </Table.Column>
        <Table.Column>
          {errand.status === Status.SUSPENDED ? (
            <time dateTime={errand.touched}>{prettyTime(errand.suspension?.suspendedTo)}</time>
          ) : (
            Priority[errand.priority]
          )}
        </Table.Column>
        {(isKC() || isIS()) && <Table.Column>{Channels[errand.channel]}</Table.Column>}
        <Table.Column>
          {getAdminName(
            supportAdmins?.find((a: SupportAdmin) =>
              errand.assignedUserId ? a.adAccount === errand.assignedUserId : a.adAccount === errand.assignedUserId
            ),
            errand
          )}
        </Table.Column>
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
