import { PriorityComponent } from '@common/components/priority/priority.component';
import { prettyTime, sortBy, truncate } from '@common/services/helper-service';
import { Admin } from '@common/services/user-service';
import { useMetadataStore, useUserStore } from '@stores/index';
import { All, Priority } from '@supportmanagement/interfaces/priority';
import {
  Channels,
  getClassificationCategoryDisplayName,
  getClassificationTypeDisplayName,
  getLabelCategory,
  getLabelSubType,
  getLabelType,
  Status,
  SupportErrand,
  usesLabelCategorization,
} from '@supportmanagement/services/support-errand-service';
import { getLabelDisplayName } from '@supportmanagement/services/support-label-service';
import { getAdminName, primaryStakeholderNameorEmail } from '@supportmanagement/services/support-stakeholder-service';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { SupportStatusLabelComponent } from '../ongoing-support-errands/components/support-status-label.component';

/**
 * Whether the overview shows the errand's classification (category/type) rather than its labels.
 * Applications that do not classify with labels always use category/type. In label-based applications
 * this is for backward compatibility only: errands registered before the switch to labels have a
 * classification but no labels, so their classification is shown instead.
 */
const showsClassification = (errand: SupportErrand): boolean => !usesLabelCategorization() || !errand.labels?.length;

export const useSupportErrandTable = (statuses: Status[]) => {
  const { t } = useTranslation();
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const administrators = useUserStore((s) => s.administrators);

  const labels = [
    {
      label: t('common:overview.status'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
      render: (errand: SupportErrand) => (
        <SupportStatusLabelComponent
          status={errand.status ?? ''}
          resolution={errand.resolution ?? ''}
          actions={errand?.actions ?? []}
        />
      ),
    },
    {
      label: t('common:overview.lastActivity'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
      render: (errand: SupportErrand) => {
        const notification = sortBy(errand?.activeNotifications ?? [], 'created').reverse()[0];
        return (
          <>
            {!!notification ? (
              <div className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
                <div>
                  <time dateTime={dayjs(notification?.created).format('YYYY-MM-DD HH:mm')}>
                    {notification?.created ? dayjs(notification?.created).format('YYYY-MM-DD HH:mm') : ''}
                  </time>
                </div>
                <div className="italic">{truncate(notification?.description, 30)}</div>
              </div>
            ) : (
              dayjs(errand.touched).format('YYYY-MM-DD HH:mm')
            )}
          </>
        );
      },
    },
    {
      label: t(
        `common:overview.orderType.${process.env.NEXT_PUBLIC_APPLICATION}`,
        t('common:overview.orderType.default')
      ),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,

      render: (errand: SupportErrand) => (
        <div>
          <div className="font-bold">
            {showsClassification(errand)
              ? getClassificationCategoryDisplayName(errand, supportMetadata)
              : getLabelDisplayName(getLabelCategory(errand, supportMetadata!), supportMetadata)}
          </div>
          <div className="font-normal">{errand.errandNumber}</div>
        </div>
      ),
    },
    {
      label: t(
        `common:overview.errandType.${process.env.NEXT_PUBLIC_APPLICATION}`,
        t(`common:overview.errandType.default`)
      ),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
      render: (errand: SupportErrand) => (
        <div className="max-w-[280px]">
          {showsClassification(errand) ? (
            <span className="m-0">{getClassificationTypeDisplayName(errand, supportMetadata)}</span>
          ) : (
            <div>
              <div>{getLabelDisplayName(getLabelType(errand), supportMetadata)}</div>
              <div>{getLabelDisplayName(getLabelSubType(errand), supportMetadata)}</div>
            </div>
          )}
        </div>
      ),
    },
    {
      label: t('common:overview.incomingVia'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
      render: (errand: SupportErrand) => (
        <div className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
          <div>{(Channels as Record<string, string>)[errand?.channel!]}</div>
          <div className="m-0 italic truncate">
            {truncate(errand?.title !== 'Empty errand' ? errand?.title : null, 30) || null}
          </div>
        </div>
      ),
    },
    {
      label: t('common:overview.registered'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
      render: (errand: SupportErrand) => (
        <div className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
          <div>
            <time dateTime={errand.created}>{dayjs(errand.created).format('YYYY-MM-DD, HH:mm')}</time>
          </div>
          <div>
            <p className="m-0 italic truncate">{primaryStakeholderNameorEmail(errand)}</p>
          </div>
        </div>
      ),
    },
    {
      label: t('common:overview.priority'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: [Status.NEW, Status.ONGOING, Status.PENDING, Status.SOLVED, Status.SUSPENDED, Status.ASSIGNED],
      render: (errand: SupportErrand) => (
        <PriorityComponent priority={(Priority as Record<string, string>)[errand.priority!]} />
      ),
    },
    {
      label: t('common:overview.reminder'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: [Status.SUSPENDED],
      render: (errand: SupportErrand) => (
        <time dateTime={errand.touched}>{prettyTime(errand.suspension?.suspendedTo!)}</time>
      ),
    },
    {
      label: t('common:overview.responsible'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: Object.values(Status).filter((status) => status !== Status.NEW),
      render: (errand: SupportErrand) => {
        return <>{getAdminName(administrators?.find((a: Admin) => a?.adAccount === errand?.assignedUserId)!)}</>;
      },
    },
    {
      label: t('common:overview.registeredBy'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: [Status.NEW],
      render: (errand: SupportErrand) => {
        return <>{getAdminName(administrators?.find((a: Admin) => a?.adAccount === errand?.assignedUserId)!)}</>;
      },
    },
  ];

  return labels.filter(
    (label) => label.shownForStatus === All.ALL || statuses?.some((status) => label.shownForStatus.includes(status))
  );
};
