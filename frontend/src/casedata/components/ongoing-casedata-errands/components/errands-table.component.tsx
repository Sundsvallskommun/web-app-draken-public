import { CaseLabels, getShortLabel } from '@casedata/interfaces/case-label';
import { IErrand } from '@casedata/interfaces/errand';
import { Priority } from '@casedata/interfaces/priority';
import { findStatusLabelForStatusKey, isErrandClosed } from '@casedata/services/casedata-errand-service';
import { getErrandPropertyDesignations } from '@casedata/services/casedata-facilities-service';
import { globalAcknowledgeCasedataNotification } from '@casedata/services/casedata-notification-service';
import { isMEX, isPT } from '@common/services/application-service';
import { sortBy } from '@common/services/helper-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Badge,
  Button,
  Callout,
  Input,
  Label,
  Pagination,
  Select,
  Spinner,
  Table,
  cx,
  useThemeQueries,
} from '@sk-web-gui/react';
import { SortMode } from '@sk-web-gui/table';
import dayjs from 'dayjs';
import NextLink from 'next/link';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { TableForm } from '../ongoing-casedata-errands.component';
import { CasedataStatusLabelComponent } from './casedata-status-label.component';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { PriorityComponent } from '@common/components/priority/priority.component';

export const ErrandsTable: React.FC = () => {
  const { watch, setValue, register } = useFormContext<TableForm>();
  const { municipalityId, errands: data } = useAppContext();
  const [rowHeight, setRowHeight] = useState<string>('normal');
  const sortOrder = watch('sortOrder');
  const sortColumn = watch('sortColumn');
  const totalPages = watch('totalPages');
  const page = watch('page');

  const { isMaxMediumDevice } = useThemeQueries();

  const sortOrders: { [key: string]: 'ascending' | 'descending' } = {
    asc: 'ascending',
    desc: 'descending',
  };

  const serverSideSortableColsMEX: { [key: number]: string } = {
    0: 'facilities.address.propertyDesignation',
    1: 'updated',
    2: 'caseType',
    3: 'extraParameters.caseMeaning',
    4: 'priority',
    5: 'created',
    6: 'administrator',
    7: 'status.statusType',
  };

  const serverSideSortableColsPT: { [key: number]: string } = {
    0: 'status.statusType',
    1: 'updated',
    2: 'caseType',
    3: 'errandNumber',
    4: 'priority',
    5: 'stakeholders.lastName',
    6: 'created',
    7: 'administrator',
  };

  const handleSort = (index: number) => {
    if (isPT()) {
      if (sortColumn === serverSideSortableColsPT[index]) {
        setValue('sortOrder', sortOrder === 'desc' ? 'asc' : 'desc');
      } else {
        setValue('sortColumn', serverSideSortableColsPT[index]);
      }
    } else {
      if (sortColumn === serverSideSortableColsMEX[index]) {
        setValue('sortOrder', sortOrder === 'desc' ? 'asc' : 'desc');
      } else {
        setValue('sortColumn', serverSideSortableColsMEX[index]);
      }
    }
  };

  const handleClick = async (errand) => {
    if (errand.notifications && errand.notifications.length > 0) {
      await globalAcknowledgeCasedataNotification(errand, municipalityId).catch(() => {
        throw new Error('Failed to acknowledge notification');
      });
    }
    window.open(`${process.env.NEXT_PUBLIC_BASEPATH}/arende/${municipalityId}/${errand.errandNumber}`, '_blank');
  };

  const primaryStakeholderNameorEmail = (errand: IErrand) => {
    const primaryStakeholder = getOwnerStakeholder(errand);

    if (primaryStakeholder) {
      const { firstName, lastName, organizationName } = primaryStakeholder;
      if (firstName && lastName) return `${firstName} ${lastName}`;

      if (organizationName) return `${organizationName}`;

      const emailChannel = primaryStakeholder.emails?.[0]?.value;
      if (!!emailChannel) return emailChannel;
    }
    return '';
  };

  const findLatestNotification = (errand: IErrand) => {
    return sortBy(errand?.notifications, 'created').reverse()[0];
  };

  const headers = data.labels.map((header, index) => (
    <Table.HeaderColumn key={`header-${index}`} sticky={header.sticky}>
      {header.screenReaderOnly ? (
        <span className="sr-only">{header.label}</span>
      ) : header.sortable ? (
        <Table.SortButton
          isActive={
            isPT() ? sortColumn === serverSideSortableColsPT[index] : sortColumn === serverSideSortableColsMEX[index]
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

  const rows = (data.errands || []).map((errand: IErrand, index) => {
    const notification = findLatestNotification(errand);
    const caseMeaning = errand.extraParameters.find((param) => param.key === 'caseMeaning');
    if (caseMeaning && caseMeaning.values?.[0].length > 27) {
      caseMeaning.values[0] = `${caseMeaning.values[0].substring(0, 27)}...`;
    }
    return (
      <Table.Row
        key={`row-${index}`}
        aria-label={`Ärende ${errand.errandNumber}, öppna ärende i ny flik`}
        onClick={() => handleClick(errand)}
        className="cursor-pointer"
      >
        <Table.HeaderColumn
          scope="row"
          className={cx('w-[200px] whitespace-nowrap text-ellipsis table-caption', !isPT() && ' overflow-hidden')}
        >
          {isPT() ? (
            <CasedataStatusLabelComponent status={findStatusLabelForStatusKey(errand.status?.statusType)} />
          ) : (
            getErrandPropertyDesignations(errand).join(', ')
          )}
        </Table.HeaderColumn>
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
            errand.updated
          )}
        </Table.Column>
        <Table.Column scope="row" className={isPT() && 'font-bold max-w-[190px] whitespace-nowrap overflow-x-hidden'}>
          {isPT() ? (
            <>{getShortLabel(errand.caseType)}</>
          ) : (
            <div className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
              <div>{CaseLabels.ALL[errand.caseType] ?? ''}</div>
              <div>{errand.errandNumber}</div>
            </div>
          )}
        </Table.Column>
        {isMEX() && <Table.Column>{caseMeaning?.values}</Table.Column>}
        {isPT() && <Table.Column>{errand.errandNumber}</Table.Column>}
        <Table.Column>
          <PriorityComponent priority={errand.priority} />
        </Table.Column>
        {isPT() && (
          <Table.Column>
            {errand.stakeholders.map((stakeholder) => {
              if (stakeholder.roles.find((role) => role === 'APPLICANT'))
                return `${stakeholder.firstName || ''} ${stakeholder.lastName || ''}`;
            })}
          </Table.Column>
        )}
        <Table.Column className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
          <div>
            <time dateTime={errand.created}>{errand.created}</time>
          </div>
          <div>
            <p className="m-0 italic truncate">{primaryStakeholderNameorEmail(errand)}</p>
          </div>
        </Table.Column>
        <Table.Column>
          {`${errand.administrator?.firstName || ''} ${errand.administrator?.lastName || ''}`}
        </Table.Column>
        {!isPT() && (
          <Table.Column>
            <CasedataStatusLabelComponent status={findStatusLabelForStatusKey(errand.status?.statusType)} />
          </Table.Column>
        )}
        <Table.Column sticky>
          <div className="w-full flex justify-end">
            <NextLink
              href={`/arende/${municipalityId}/${errand.errandNumber}`}
              onClick={(e) => e.stopPropagation()}
              target="_blank"
              data-icon={isMaxMediumDevice}
              title={isMaxMediumDevice ? `${isErrandClosed(errand) ? 'Visa' : 'Hantera'} ärende` : undefined}
              className={cx(
                'no-underline sk-btn max-lg:sk-btn-icon',
                rowHeight === 'normal' && !isMaxMediumDevice && !isPT() ? 'sk-btn-md' : 'sk-btn-sm',
                isPT() && 'sk-btn-sm bg-primary text-light-primary w-full hover:text-dark-secondary',
                isErrandClosed(errand) && !isPT() ? 'sk-btn-secondary' : 'sk-btn-tertiary'
              )}
            >
              <Button.Content rightIcon={!isMaxMediumDevice && !isPT() && <LucideIcon name="external-link" />}>
                {isPT() ? (
                  errand.administrator ? (
                    <>
                      <span className="hidden md:inline">Öppna</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden md:inline">Visa</span>
                    </>
                  )
                ) : (
                  <>
                    {isErrandClosed(errand) ? (
                      <>
                        <span className="hidden md:inline">Visa</span>
                        <LucideIcon className="inline md:hidden" name="view" />
                      </>
                    ) : (
                      <>
                        <span className="hidden md:inline">Hantera</span>
                        <LucideIcon className="inline md:hidden" name="pencil" />
                      </>
                    )}
                  </>
                )}
              </Button.Content>
            </NextLink>
          </div>
        </Table.Column>
      </Table.Row>
    );
  });

  return (
    <div className="max-w-full overflow-x-hidden">
      {data.isLoading && (
        <div className="z-100 absolute top-0 bottom-0 left-0 right-0 bg-background-content opacity-50 w-full h-full flex items-center justify-center">
          <div>
            <Spinner size={4} />
          </div>
        </div>
      )}
      <Table data-cy="main-casedata-table" dense={rowHeight === 'dense'} aria-describedby="errandTableCaption">
        {rows?.length === 0 || data.error === '404' ? (
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
        {data.errands.length > 0 && (
          <>
            <Table.Header>
              {headers}
              <Table.HeaderColumn sticky>
                <span className="sr-only">Hantera</span>
              </Table.HeaderColumn>
            </Table.Header>
            <Table.Body>{rows}</Table.Body>
          </>
        )}

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
      </Table>
    </div>
  );
};
