import { Priority } from '@casedata/interfaces/priority';
import { Category } from '@common/data-contracts/supportmanagement/data-contracts';
import { isKA, isKC, isLOP } from '@common/services/application-service';
import { prettyTime, sortBy, truncate } from '@common/services/helper-service';
import { appConfig } from '@config/appconfig';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { Input, Pagination, Select, Spinner, Table } from '@sk-web-gui/react';
import { SortMode } from '@sk-web-gui/table';
import { useOngoingSupportErrandLabels } from '@supportmanagement/components/support-errand/support-labels.component';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import {
  Channels,
  Status,
  SupportErrand,
  getLabelCategory,
  getLabelSubType,
  getLabelType,
} from '@supportmanagement/services/support-errand-service';
import { globalAcknowledgeSupportNotification } from '@supportmanagement/services/support-notification-service';
import { getAdminName } from '@supportmanagement/services/support-stakeholder-service';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { TableForm } from '../ongoing-support-errands.component';
import { SupportStatusLabelComponent } from './support-status-label.component';

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

  const headers = useOngoingSupportErrandLabels(selectedSupportErrandStatuses).map((header, index) => (
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
        <Table.Column>
          <SupportStatusLabelComponent status={errand.status} resolution={errand.resolution} />
        </Table.Column>
        <Table.Column>
          {!!notification ? (
            <div className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
              <div>
                <time dateTime={dayjs(notification?.created).format('YYYY-MM-DD HH:mm')}>
                  {notification?.created ? dayjs(notification?.created).format('YYYY-MM-DD HH:mm') : ''}
                </time>
              </div>
              <div className="italic">{notification?.description ? notification?.description : ''}</div>
            </div>
          ) : (
            dayjs(errand.touched).format('YYYY-MM-DD HH:mm')
          )}
        </Table.Column>
        <Table.HeaderColumn
          scope="row"
          className="w-[200px] whitespace-nowrap overflow-hidden text-ellipsis table-caption"
        >
          {appConfig.features.useThreeLevelCategorization ? (
            <div>{getLabelCategory(errand, supportMetadata)?.displayName || ''}</div>
          ) : null}
          {appConfig.features.useTwoLevelCategorization ? (
            <div>{categories?.find((t) => t.name === errand.category)?.displayName || errand.category}</div>
          ) : null}

          <div className="font-normal">{errand.errandNumber}</div>
        </Table.HeaderColumn>
        <Table.Column scope="row">
          <div className="max-w-[280px]">
            {appConfig.features.useThreeLevelCategorization ? (
              <div>
                <div>{getLabelType(errand, supportMetadata)?.displayName || ''}</div>
                <div>{getLabelSubType(errand, supportMetadata)?.displayName || ''}</div>
              </div>
            ) : null}
            {appConfig.features.useTwoLevelCategorization ? (
              <>
                <p className="m-0">
                  {categories?.find((t) => t.name === errand.category)?.types.find((t) => t.name === errand.type)
                    ?.displayName || errand.type}
                </p>
              </>
            ) : null}
          </div>
        </Table.Column>
        <Table.Column>
          <div className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
            <div>{Channels[errand?.channel]}</div>
            <div className="m-0 italic truncate">
              {truncate(errand?.title !== 'Empty errand' ? errand?.title : null, 30) || null}
            </div>
          </div>
        </Table.Column>
        <Table.Column className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
          <div>
            <time dateTime={errand.created}>{dayjs(errand.created).format('YYYY-MM-DD, HH:mm')}</time>
          </div>
          {isLOP() || isKA() ? (
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
