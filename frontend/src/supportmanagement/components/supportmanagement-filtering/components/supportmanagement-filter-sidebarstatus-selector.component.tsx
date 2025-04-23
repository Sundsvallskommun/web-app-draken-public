import { SidebarButton } from '@common/interfaces/sidebar-button';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { LucideIcon } from '@sk-web-gui/lucide-icon';
import { Badge, Button } from '@sk-web-gui/react';
import store from '@supportmanagement/services/storage-service';
import {
  assignedStatuses,
  closedStatuses,
  getStatusLabel,
  newStatuses,
  ongoingStatuses,
  ongoingStatusesROB,
  Status,
  suspendedStatuses,
} from '@supportmanagement/services/support-errand-service';
import { useMemo } from 'react';
import { isROB } from '@common/services/application-service';

export interface SupportManagementStatusFilter {
  status: Status[];
}

export const SupportManagementStatusValues = {
  status: [],
};

export const SupportManagementFilterSidebarStatusSelector: React.FC<{
  showAttestationTable;
  setShowAttestationTable;
  iconButton: boolean;
}> = ({ showAttestationTable, setShowAttestationTable, iconButton }) => {
  const {
    isLoading,
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
        label: getStatusLabel(newStatuses),
        key: newStatuses[0],
        statuses: newStatuses,
        icon: 'inbox',
        totalStatusErrands: newSupportErrands.totalElements,
      },
      {
        label: isROB() ? getStatusLabel(ongoingStatusesROB) : getStatusLabel(ongoingStatuses),
        key: isROB() ? ongoingStatusesROB[0] : ongoingStatuses[0],
        statuses: isROB() ? ongoingStatusesROB : ongoingStatuses,
        icon: 'clipboard-pen',
        totalStatusErrands: ongoingSupportErrands.totalElements,
      },
      {
        label: getStatusLabel(suspendedStatuses),
        key: suspendedStatuses[0],
        statuses: suspendedStatuses,
        icon: 'circle-pause',
        totalStatusErrands: suspendedSupportErrands.totalElements,
      },
      {
        label: getStatusLabel(assignedStatuses),
        key: assignedStatuses[0],
        statuses: assignedStatuses,
        icon: 'file-plus',
        totalStatusErrands: assignedSupportErrands.totalElements,
      },
      {
        label: getStatusLabel(closedStatuses),
        key: closedStatuses[0],
        statuses: closedStatuses,
        icon: 'circle-check-big',
        totalStatusErrands: solvedSupportErrands.totalElements,
      },
    ],
    [, newSupportErrands, ongoingSupportErrands, suspendedSupportErrands, assignedSupportErrands, solvedSupportErrands]
  );

  return (
    <>
      {supportSidebarButtons?.map((button) => {
        const buttonIsActive = selectedSupportErrandStatuses.includes(button.key as Status);
        return (
          <Button
            onClick={() => {
              updateStatusFilter(button.statuses as Status[]);
              setSidebarLabel(button.label);
              setShowAttestationTable(false);
            }}
            aria-label={`status-button-${button.key}`}
            variant={buttonIsActive && !showAttestationTable ? 'primary' : 'ghost'}
            className={`${!iconButton && 'justify-start'} ${!buttonIsActive && 'hover:bg-dark-ghost'}`}
            leftIcon={<LucideIcon name={button.icon as any} />}
            key={button.key}
            iconButton={iconButton}
          >
            {!iconButton && (
              <span className="w-full flex justify-between">
                {button.label}
                <Badge
                  className="min-w-fit px-4"
                  inverted={!buttonIsActive || showAttestationTable}
                  color={buttonIsActive && !showAttestationTable ? 'tertiary' : 'vattjom'}
                  counter={
                    isLoading ? '-' : button.totalStatusErrands > 999 ? '999+' : button.totalStatusErrands || '0'
                  }
                />
              </span>
            )}
          </Button>
        );
      })}
    </>
  );
};
