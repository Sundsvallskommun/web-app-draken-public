import { SidebarButton } from '@common/interfaces/sidebar-button';
import { isROB } from '@common/services/application-service';
import { useCasedataStore, useSupportStore } from '@stores/index';
import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';
import { Badge, Button, Spinner } from '@sk-web-gui/react';
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

export interface SupportManagementStatusFilter {
  status: Status[];
}

export const SupportManagementStatusValues: SupportManagementStatusFilter = {
  status: [],
};

export const SupportManagementFilterSidebarStatusSelector: React.FC<{
  showAttestationTable: boolean;
  setShowAttestationTable: (show: boolean) => void;
  iconButton: boolean;
}> = ({ showAttestationTable, setShowAttestationTable, iconButton }) => {
  const setSidebarLabel = useCasedataStore((s) => s.setSidebarLabel);
  const setSelectedSupportErrandStatuses = useSupportStore((s) => s.setSelectedSupportErrandStatuses);
  const selectedSupportErrandStatuses = useSupportStore((s) => s.selectedSupportErrandStatuses);
  const newSupportErrands = useSupportStore((s) => s.newSupportErrands);
  const ongoingSupportErrands = useSupportStore((s) => s.ongoingSupportErrands);
  const assignedSupportErrands = useSupportStore((s) => s.assignedSupportErrands);
  const suspendedSupportErrands = useSupportStore((s) => s.suspendedSupportErrands);
  const solvedSupportErrands = useSupportStore((s) => s.solvedSupportErrands);

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

  const supportSidebarButtons = useMemo<SidebarButton[]>(
    () => [
      {
        label: getStatusLabel(newStatuses) ?? '',
        key: newStatuses[0],
        statuses: newStatuses,
        icon: 'inbox',
        totalStatusErrands: newSupportErrands,
      },
      {
        label: (isROB() ? getStatusLabel(ongoingStatusesROB) : getStatusLabel(ongoingStatuses)) ?? '',
        key: isROB() ? ongoingStatusesROB[0] : ongoingStatuses[0],
        statuses: isROB() ? ongoingStatusesROB : ongoingStatuses,
        icon: 'clipboard-pen',
        totalStatusErrands: ongoingSupportErrands,
      },
      {
        label: getStatusLabel(suspendedStatuses) ?? '',
        key: suspendedStatuses[0],
        statuses: suspendedStatuses,
        icon: 'circle-pause',
        totalStatusErrands: suspendedSupportErrands,
      },
      {
        label: getStatusLabel(assignedStatuses) ?? '',
        key: assignedStatuses[0],
        statuses: assignedStatuses,
        icon: 'file-plus',
        totalStatusErrands: assignedSupportErrands,
      },
      {
        label: getStatusLabel(closedStatuses) ?? '',
        key: closedStatuses[0],
        statuses: closedStatuses,
        icon: 'circle-check-big',
        totalStatusErrands: solvedSupportErrands,
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
            leftIcon={(() => { const DynIcon = iconMap[button.icon as string]; return DynIcon ? <DynIcon /> : undefined; })()}
            key={button.key}
            iconButton={iconButton}
          >
            {!iconButton && (
              <span className="w-full flex justify-between">
                {button.label}
                {button.totalStatusErrands === null ? (
                  <Spinner color="vattjom" size={2} />
                ) : (
                  <Badge
                    className="min-w-fit px-4"
                    inverted={!buttonIsActive || showAttestationTable}
                    color={buttonIsActive && !showAttestationTable ? 'tertiary' : 'vattjom'}
                    counter={button.totalStatusErrands > 999 ? '999+' : button.totalStatusErrands}
                  />
                )}
              </span>
            )}
          </Button>
        );
      })}
    </>
  );
};
