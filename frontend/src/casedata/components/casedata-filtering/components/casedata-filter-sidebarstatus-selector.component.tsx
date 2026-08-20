import { ErrandStatus } from '@casedata/interfaces/errand-status';
import {
  assignedStatuses,
  closedStatuses,
  getStatusLabel,
  newStatuses,
  ongoingStatuses,
  suspendedStatuses,
} from '@casedata/services/casedata-errand-service';
import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';
import { SidebarButton } from '@common/interfaces/sidebar-button';
import { Badge, Button, Spinner } from '@sk-web-gui/react';
import { useUiSettingsStore } from '@stores/ui-settings-store';
import { FC, useMemo } from 'react';
export const CasedataFilterSidebarStatusSelector: FC<{
  showContractTable: boolean;
  setShowContractTable: (show: boolean) => void;
  iconButton: boolean;
}> = ({ showContractTable, setShowContractTable, iconButton }) => {
  const setSelectedErrandStatuses = useUiSettingsStore((s) => s.setSelectedErrandStatuses);
  const selectedErrandStatuses = useUiSettingsStore((s) => s.selectedErrandStatuses);
  const setSidebarLabel = useUiSettingsStore((s) => s.setSidebarLabel);
  const setFilter = useUiSettingsStore((s) => s.setFilter);
  const filter = useUiSettingsStore((s) => s.filter);
  const newErrands = useUiSettingsStore((s) => s.newErrands);
  const ongoingErrands = useUiSettingsStore((s) => s.ongoingErrands);
  const assignedErrands = useUiSettingsStore((s) => s.assignedErrands);
  const suspendedErrands = useUiSettingsStore((s) => s.suspendedErrands);
  const closedErrands = useUiSettingsStore((s) => s.closedErrands);

  const updateStatusFilter = (ss: ErrandStatus[]) => {
    try {
      const labelsToKeys: Record<ErrandStatus, string> = {} as Record<ErrandStatus, string>;
      Object.entries(ErrandStatus).forEach(([k, v]) => {
        labelsToKeys[v] = k;
      });
      const statusKeys = ss.map((s) => labelsToKeys[s]);
      const status = statusKeys.join(',');
      setFilter({ ...filter, status });
      setSelectedErrandStatuses(statusKeys as ErrandStatus[]);
    } catch (error) {
      console.error('Error updating status filter');
    }
  };

  const casedataSidebarButtons: SidebarButton[] = useMemo(
    () => [
      {
        label: getStatusLabel(newStatuses),
        key: newStatuses[0],
        statuses: newStatuses,
        icon: 'inbox',
        totalStatusErrands: newErrands,
      },
      {
        label: getStatusLabel(ongoingStatuses),
        key: ongoingStatuses[0],
        statuses: ongoingStatuses,
        icon: 'clipboard-pen',
        totalStatusErrands: ongoingErrands,
      },
      {
        label: getStatusLabel(suspendedStatuses),
        key: suspendedStatuses[0],
        statuses: suspendedStatuses,
        icon: 'circle-pause',
        totalStatusErrands: suspendedErrands,
      },
      {
        label: getStatusLabel(assignedStatuses),
        key: assignedStatuses[0],
        statuses: assignedStatuses,
        icon: 'file-plus',
        totalStatusErrands: assignedErrands,
      },
      {
        label: getStatusLabel(closedStatuses),
        key: closedStatuses[0],
        statuses: closedStatuses,
        icon: 'circle-check-big',
        totalStatusErrands: closedErrands,
      },
    ],
    [newErrands, ongoingErrands, suspendedErrands, assignedErrands, closedErrands]
  );

  return (
    <>
      {casedataSidebarButtons?.map((button) => {
        const buttonIsActive = button.statuses.some((s) => {
          return selectedErrandStatuses
            .map((s) => ErrandStatus[s as keyof typeof ErrandStatus])
            .includes(s as ErrandStatus);
        });
        return (
          <Button
            onClick={() => {
              updateStatusFilter(button.statuses as ErrandStatus[]);
              setSidebarLabel(button.label);
              setShowContractTable(false);
            }}
            aria-label={`status-button-${button.key}`}
            variant={buttonIsActive && !showContractTable ? 'primary' : 'ghost'}
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
                    inverted={!buttonIsActive || showContractTable}
                    color={buttonIsActive && !showContractTable ? 'tertiary' : 'vattjom'}
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
