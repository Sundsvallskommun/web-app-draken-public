import { All, Priority } from '@supportmanagement/interfaces/priority';
import {
  Channels,
  getLabelCategory,
  getLabelSubType,
  getLabelType,
  Status,
} from '@supportmanagement/services/support-errand-service';
import { useTranslation } from 'react-i18next';
import { SupportStatusLabelComponent } from '../ongoing-support-errands/components/support-status-label.component';
import { appConfig } from '@config/appconfig';
import { useAppContext } from '@contexts/app.context';
import { prettyTime, sortBy, truncate } from '@common/services/helper-service';
import dayjs from 'dayjs';
import { getAdminName, primaryStakeholderNameorEmail } from '@supportmanagement/services/support-stakeholder-service';
import { PriorityComponent } from '@common/components/priority/priority.component';
import { Admin } from '@common/services/user-service';

export const useSupportErrandTable = (statuses: Status[]) => {
  const { t } = useTranslation();
  const { supportMetadata, administrators } = useAppContext();

  const labels = [
    {
      label: t('common:overview.status'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
      render: (errand) => <SupportStatusLabelComponent status={errand.status} resolution={errand.resolution} />,
    },
    {
      label: t('common:overview.lastActivity'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
      render: (errand) => {
        const notification = sortBy(errand?.activeNotifications, 'created').reverse()[0];
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

      render: (errand) => (
        <div>
          {appConfig.features.useThreeLevelCategorization ? (
            <div className="font-bold">{getLabelCategory(errand, supportMetadata)?.displayName || ''}</div>
          ) : null}
          {appConfig.features.useTwoLevelCategorization ? (
            <div className="font-bold">
              {supportMetadata?.categories?.find((t) => t.name === errand.category)?.displayName || errand.category}
            </div>
          ) : null}
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
      render: (errand) => (
        <div className="max-w-[280px]">
          {appConfig.features.useThreeLevelCategorization ? (
            <div>
              <div>{getLabelType(errand)?.displayName || ''}</div>
              <div>{getLabelSubType(errand)?.displayName || ''}</div>
            </div>
          ) : null}
          {appConfig.features.useTwoLevelCategorization ? (
            <>
              <span className="m-0">
                {supportMetadata?.categories
                  ?.find((t) => t.name === errand.category)
                  ?.types.find((t) => t.name === errand.type)?.displayName || errand.type}
              </span>
            </>
          ) : null}
        </div>
      ),
    },
    {
      label: t('common:overview.incomingVia'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
      render: (errand) => (
        <div className="whitespace-nowrap overflow-hidden text-ellipsis table-caption">
          <div>{Channels[errand?.channel]}</div>
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
      render: (errand) => (
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
      render: (errand) => <PriorityComponent priority={Priority[errand.priority]} />,
    },
    {
      label: t('common:overview.reminder'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: [Status.SUSPENDED],
      render: (errand) => <time dateTime={errand.touched}>{prettyTime(errand.suspension?.suspendedTo)}</time>,
    },
    {
      label: t('common:overview.responsible'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: Object.values(Status).filter((status) => status !== Status.NEW),
      render: (errand) => {
        return <>{getAdminName(administrators?.find((a: Admin) => a?.adAccount === errand?.assignedUserId))}</>;
      },
    },
    {
      label: t('common:overview.registeredBy'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: [Status.NEW],
      render: (errand) => {
        return <>{getAdminName(administrators?.find((a: Admin) => a?.adAccount === errand?.assignedUserId))}</>;
      },
    },
  ];

  return labels.filter(
    (label) => label.shownForStatus === All.ALL || statuses?.some((status) => label.shownForStatus.includes(status))
  );
};
