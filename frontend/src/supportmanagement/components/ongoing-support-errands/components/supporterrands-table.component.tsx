import { Priority } from '@casedata/interfaces/priority';
import { Category } from '@common/data-contracts/supportmanagement/data-contracts';
import { isIK, isKC, isLOP } from '@common/services/application-service';
import { prettyTime, sortBy } from '@common/services/helper-service';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { useMediaQuery } from '@mui/material';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Callout, Input, Label, Pagination, Select, Spinner, Table, useGui } from '@sk-web-gui/react';
import { SortMode } from '@sk-web-gui/table';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import {
  Channels,
  Resolution,
  Status,
  StatusLabel,
  SupportErrand,
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
import { globalAcknowledgeSupportNotification } from '@supportmanagement/services/support-notification-service';

export const SupportErrandsTable: React.FC = () => {
  const { watch, setValue, register } = useFormContext<TableForm>();
  const {
    supportErrands: data,
    supportMetadata,
    supportAdmins,
    municipalityId,
    selectedSupportErrandStatuses,
  }: AppContextInterface = useAppContext();
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

  useEffect(() => {
    setCategories(supportMetadata?.categories);
  }, [supportMetadata]);

  const sortOrders: { [key: string]: 'ascending' | 'descending' } = {
    asc: 'ascending',
    desc: 'descending',
  };

  const serverSideSortableColsKC: { [key: number]: string } = {
    0: 'status',
    1: 'touched',
    2: 'category',
    3: 'type',
    4: 'created',
    5: 'priority',
    6: 'channel',
    7: 'assignedUserId',
  };

  const serverSideSortableColsLOP: { [key: number]: string } =
    data.errands && (data.errands[0]?.status === Status.SUSPENDED || data.errands[0]?.status === Status.ASSIGNED)
      ? {
          0: 'status',
          1: 'touched',
          2: 'category',
          3: 'type',
          4: 'subType',
          5: 'channel',
          6: 'created',
          7: 'suspendedTo',
          8: 'assignedUserId',
        }
      : {
          0: 'status',
          1: 'touched',
          2: 'category',
          3: 'type',
          4: 'subType',
          5: 'channel',
          6: 'created',
          7: 'priority',
          8: 'assignedUserId',
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

  const headers = getOngoingSupportErrandLabels(selectedSupportErrandStatuses).map((header, index) => (
    <Table.HeaderColumn key={`header-${index}`} sticky={true}>
      {header.screenReaderOnly ? (
        <span className="sr-only">{header.label}</span>
      ) : header.sortable ? (
        <Table.SortButton
          isActive={
            isKC() ? sortColumn === serverSideSortableColsKC[index] : sortColumn === serverSideSortableColsLOP[index]
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

  const primaryStakeholderNameorEmail = (errand: SupportErrand) => {
    const primaryStakeholder = errand.stakeholders.find((primary) => primary.role === 'PRIMARY');
    if (primaryStakeholder) {
      const { firstName, lastName, contactChannels } = primaryStakeholder;
      if (firstName && lastName) return `${firstName} ${lastName}`;

      const emailChannel = contactChannels.find((channel) => channel.type === 'EMAIL');
      if (emailChannel?.value) return emailChannel.value;
    }
    return '';
  };

  const findLatestNotification = (errand: SupportErrand) => {
    return sortBy(errand?.activeNotifications, 'created').reverse()[0];
  };

  const rows = (data.errands || []).map((errand: SupportErrand, index) => {
    const notification = findLatestNotification(errand);
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
        <Table.Column>{StatusLabelComponent(errand.status, errand.resolution)}</Table.Column>
        <Table.Column>
          {!!notification ? (
            <>
              <div>
                {notification?.globalAcknowledged === false ? (
                  <>
                    <Callout color="vattjom"></Callout>
                    <span className="sr-only">Ny händelse på ärendet</span>
                  </>
                ) : null}
              </div>
              <div className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
                <div>
                  <time dateTime={notification?.created}>
                    {notification?.created ? dayjs(notification?.created).format('YYYY-MM-DD HH:mm') : ''}
                  </time>
                </div>
                <div className="italic">{notification?.description ? notification?.description : ''}</div>
              </div>
            </>
          ) : (
            dayjs(errand.touched).format('YYYY-MM-DD HH:mm')
          )}
        </Table.Column>
        <Table.HeaderColumn
          scope="row"
          className="w-[200px] whitespace-nowrap overflow-hidden text-ellipsis table-caption"
        >
          {isKC() || errand.labels.length < 1 ? (
            <div>{categories?.find((t) => t.name === errand.category)?.displayName || errand.category}</div>
          ) : isLOP() || isIK() ? (
            <div>{getLabelCategory(errand, supportMetadata)?.displayName || ''}</div>
          ) : null}
          <div className="font-normal">{errand.errandNumber}</div>
        </Table.HeaderColumn>
        <Table.Column scope="row">
          <div className="max-w-[280px]">
            {isKC() || errand.labels.length < 2 ? (
              <p className="m-0">
                {categories?.find((t) => t.name === errand.category)?.types.find((t) => t.name === errand.type)
                  ?.displayName || errand.type}
              </p>
            ) : isLOP() || isIK() ? (
              <p className="m-0">{getLabelType(errand, supportMetadata)?.displayName || ''}</p>
            ) : null}
            <p className="m-0 italic truncate">{errand?.title !== 'Empty errand' ? errand?.title : null}</p>
          </div>
        </Table.Column>
        {(isLOP() || isIK()) && (
          <Table.Column>
            <div className="max-w-[280px]">
              <p className="m-0">{getLabelSubType(errand, supportMetadata)?.displayName || ''}</p>
            </div>
          </Table.Column>
        )}
        <Table.Column>{Channels[errand?.channel]}</Table.Column>
        <Table.Column className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
          <div>
            <time dateTime={errand.created}>{dayjs(errand.created).format('YYYY-MM-DD, HH:mm')}</time>
          </div>
          {isLOP() ? (
            <div>
              <p className="m-0 italic truncate">{primaryStakeholderNameorEmail(errand)}</p>
            </div>
          ) : null}
        </Table.Column>
        <Table.Column>{Priority[errand.priority]}</Table.Column>
        {errand.status === Status.SUSPENDED ? (
          <Table.Column>
            <time dateTime={errand.touched}>{prettyTime(errand.suspension?.suspendedTo)}</time>
          </Table.Column>
        ) : null}
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
