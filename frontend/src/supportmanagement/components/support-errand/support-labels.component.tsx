import { All } from '@supportmanagement/interfaces/priority';
import { Status } from '@supportmanagement/services/support-errand-service';
import { useTranslation } from 'react-i18next';

export const useOngoingSupportErrandLabels = (statuses: Status[], overrideResponsibleLabel: boolean = false) => {
  const { t } = useTranslation();
  const labels = [
    { label: t('common:overview.status'), screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
    { label: t('common:overview.lastActivity'), screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
    {
      label: t(
        `common:overview.orderType.${process.env.NEXT_PUBLIC_APPLICATION}`,
        t('common:overview.orderType.default')
      ),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
    },
    {
      label: t(
        `common:overview.errandType.${process.env.NEXT_PUBLIC_APPLICATION}`,
        t(`common:overview.errandType.default`)
      ),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
    },
    { label: t('common:overview.incomingVia'), screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
    { label: t('common:overview.registered'), screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
    {
      label: t('common:overview.priority'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: [Status.NEW, Status.ONGOING, Status.PENDING, Status.SOLVED, Status.SUSPENDED, Status.ASSIGNED],
    },
    {
      label: t('common:overview.reminder'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: [Status.SUSPENDED],
    },
    {
      label: overrideResponsibleLabel ? t('common:overview.registeredBy') : t('common:overview.responsible'),
      screenReaderOnly: false,
      sortable: true,
      shownForStatus: All.ALL,
    },
  ];

  return labels.filter(
    (label) => label.shownForStatus === All.ALL || statuses?.some((status) => label.shownForStatus.includes(status))
  );
};
