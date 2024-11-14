import { SidebarButton } from '@common/interfaces/sidebar-button';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { LucideIcon } from '@sk-web-gui/lucide-icon';
import { Badge, Button } from '@sk-web-gui/react';
import store from '@supportmanagement/services/storage-service';
import { Status } from '@supportmanagement/services/support-errand-service';
import { useMemo } from 'react';

export interface SupportManagementStatusFilter {
  status: Status[];
}

export const SupportManagementStatusValues = {
  status: [],
};

export const SupportManagementFilterSidebarStatusSelector: React.FC<{
  showAttestationTable;
  setShowAttestationTable;
}> = ({ showAttestationTable, setShowAttestationTable }) => {
  const {
    setSidebarLabel,
    setSelectedSupportErrandStatuses,
    selectedSupportErrandStatuses,
    newSupportErrands,
    ongoingSupportErrands,
    assignedSupportErrands,
    suspendedSupportErrands,
    solvedSupportErrands,
  }: AppContextInterface = useAppContext();

  const updateStatusFilter = (ss: Status[]) => {
    try {
      const storedFilter = store.get('filter');
      const jsonparsedstatus = JSON.parse(storedFilter);
      const status = ss.join(',');
      jsonparsedstatus.status = status;
      const stringified = JSON.stringify(jsonparsedstatus);
      store.set('filter', stringified);
      setSelectedSupportErrandStatuses(ss);
    } catch (error) {
      console.error('Error updating status filter');
    }
  };

  const supportSidebarButtons: SidebarButton[] = useMemo(
    () => [
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
        label: 'Tilldelade ärenden',
        key: Status.ASSIGNED,
        statuses: [Status.ASSIGNED],
        icon: 'file-plus',
        totalStatusErrands: assignedSupportErrands.totalElements,
      },
      {
        label: 'Avslutade ärenden',
        key: Status.SOLVED,
        statuses: [Status.SOLVED],
        icon: 'circle-check-big',
        totalStatusErrands: solvedSupportErrands.totalElements,
      },
    ],
    [, newSupportErrands, ongoingSupportErrands, suspendedSupportErrands, solvedSupportErrands]
  );

  return (
    <>
      {supportSidebarButtons?.map((button) => {
        return (
          <Button
            onClick={() => {
              updateStatusFilter(button.statuses as Status[]);
              setSidebarLabel(button.label);
              setShowAttestationTable(false);
            }}
            aria-label={`status-button-${button.key}`}
            variant={
              selectedSupportErrandStatuses.includes(button.key as Status) && !showAttestationTable
                ? 'primary'
                : 'ghost'
            }
            className={`justify-start ${
              !selectedSupportErrandStatuses.includes(button.key as Status) && 'hover:bg-dark-ghost'
            }`}
            leftIcon={<LucideIcon name={button.icon as any} />}
            key={button.key}
          >
            <span className="w-full flex justify-between">
              {button.label}
              <Badge
                className="min-w-fit px-4"
                inverted={!selectedSupportErrandStatuses.includes(button.key as Status) || showAttestationTable}
                color={
                  selectedSupportErrandStatuses.includes(button.key as Status) && !showAttestationTable
                    ? 'tertiary'
                    : 'vattjom'
                }
                counter={button.totalStatusErrands || '0'}
              />
            </span>
          </Button>
        );
      })}
    </>
  );
};
