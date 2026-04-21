import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';
import { SidebarButton } from '@common/interfaces/sidebar-button';
import { isROB } from '@common/services/application-service';
import { Badge, Button, Spinner } from '@sk-web-gui/react';
import { useUiSettingsStore } from '@stores/ui-settings-store';
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
import { FC, useMemo } from 'react';
export interface SupportManagementStatusFilter {
  status: Status[];
}

export const SupportManagementStatusValues: SupportManagementStatusFilter = {
  status: [],
};

export const SupportManagementFilterSidebarStatusSelector: FC<{
  showAttestationTable: boolean;
  setShowAttestationTable: (show: boolean) => void;
  iconButton: boolean;
}> = ({ showAttestationTable, setShowAttestationTable, iconButton }) => {
  const setSidebarLabel = useUiSettingsStore((s) => s.setSidebarLabel);
  const setSelectedErrandStatuses = useUiSettingsStore((s) => s.setSelectedErrandStatuses);
  const selectedErrandStatuses = useUiSettingsStore((s) => s.selectedErrandStatuses);
  const setFilter = useUiSettingsStore((s) => s.setFilter);
  const filter = useUiSettingsStore((s) => s.filter);
  const newSupportErrands = useUiSettingsStore((s) => s.newErrands);
  const ongoingSupportErrands = useUiSettingsStore((s) => s.ongoingErrands);
  const assignedSupportErrands = useUiSettingsStore((s) => s.assignedErrands);
  const suspendedSupportErrands = useUiSettingsStore((s) => s.suspendedErrands);
  const solvedSupportErrands = useUiSettingsStore((s) => s.closedErrands);

  const updateStatusFilter = (ss: Status[]) => {
    try {
      const status = ss.join(',');
      setFilter({ ...filter, status });
      setSelectedErrandStatuses(ss);
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
    [newSupportErrands, ongoingSupportErrands, suspendedSupportErrands, assignedSupportErrands, solvedSupportErrands]
  );

  return (
    <>
      {supportSidebarButtons?.map((button) => {
        const buttonIsActive = selectedErrandStatuses.includes(button.key as Status);
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
            leftIcon={(() => {
              const DynIcon = iconMap[button.icon as string];
              return DynIcon ? <DynIcon /> : undefined;
            })()}
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
