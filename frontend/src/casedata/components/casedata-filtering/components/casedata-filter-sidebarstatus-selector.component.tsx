import { ErrandStatus } from '@casedata/interfaces/errand-status';
import {
  assignedStatuses,
  closedStatuses,
  getStatusLabel,
  newStatuses,
  ongoingStatuses,
  suspendedStatuses,
} from '@casedata/services/casedata-errand-service';
import { SidebarButton } from '@common/interfaces/sidebar-button';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Badge, Button } from '@sk-web-gui/react';
import store from '@supportmanagement/services/storage-service';
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CaseStatusFilter } from './casedata-filter-status.component';

export const CasedataFilterSidebarStatusSelector: React.FC<{ iconButton: boolean }> = ({ iconButton }) => {
  const { register } = useFormContext<CaseStatusFilter>();
  const [query, setQuery] = useState<string>('');

  const {
    isLoading,
    setSelectedErrandStatuses,
    selectedErrandStatuses,
    setSidebarLabel,
    newErrands,
    ongoingErrands,
    assignedErrands,
    suspendedErrands,
    closedErrands,
  }: AppContextInterface = useAppContext();

  const updateStatusFilter = (ss: ErrandStatus[]) => {
    try {
      const labelsToKeys = {};
      Object.entries(ErrandStatus).forEach(([k, v]) => {
        labelsToKeys[v] = k;
      });
      const statusKeys = ss.map((s) => labelsToKeys[s]);
      const storedFilter = store.get('filter');
      const jsonparsedstatus = JSON.parse(storedFilter);
      const status = statusKeys.join(',');
      jsonparsedstatus.status = status;
      const stringified = JSON.stringify(jsonparsedstatus);
      store.set('filter', stringified);
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
        totalStatusErrands: newErrands.totalElements,
      },
      {
        label: getStatusLabel(ongoingStatuses),
        key: ongoingStatuses[0],
        statuses: ongoingStatuses,
        icon: 'clipboard-pen',
        totalStatusErrands: ongoingErrands.totalElements,
      },
      {
        label: getStatusLabel(suspendedStatuses),
        key: suspendedStatuses[0],
        statuses: suspendedStatuses,
        icon: 'circle-pause',
        totalStatusErrands: suspendedErrands.totalElements,
      },
      {
        label: getStatusLabel(assignedStatuses),
        key: assignedStatuses[0],
        statuses: assignedStatuses,
        icon: 'file-plus',
        totalStatusErrands: assignedErrands.totalElements,
      },
      {
        label: getStatusLabel(closedStatuses),
        key: closedStatuses[0],
        statuses: closedStatuses,
        icon: 'circle-check-big',
        totalStatusErrands: closedErrands.totalElements,
      },
    ],
    [newErrands, ongoingErrands, suspendedErrands, assignedErrands, closedErrands]
  );

  return (
    <>
      {casedataSidebarButtons?.map((button) => {
        const buttonIsActive = button.statuses.some((s) => {
          return selectedErrandStatuses.map((s) => ErrandStatus[s]).includes(s);
        });
        return (
          <Button
            onClick={() => {
              updateStatusFilter(button.statuses as ErrandStatus[]);
              setSidebarLabel(button.label);
            }}
            aria-label={`status-button-${button.key}`}
            variant={buttonIsActive ? 'primary' : 'ghost'}
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
                  inverted={!buttonIsActive}
                  color={buttonIsActive ? 'tertiary' : 'vattjom'}
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
