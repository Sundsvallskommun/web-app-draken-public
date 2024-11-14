import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { closedStatuses, newStatuses, ongoingStatuses } from '@casedata/services/casedata-errand-service';
import { SidebarButton } from '@common/interfaces/sidebar-button';
import { isSuspendEnabled } from '@common/services/feature-flag-service';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Badge, Button } from '@sk-web-gui/react';
import store from '@supportmanagement/services/storage-service';
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CaseStatusFilter } from './casedata-filter-status.component';

export const CasedataFilterSidebarStatusSelector: React.FC = () => {
  const { register } = useFormContext<CaseStatusFilter>();
  const [query, setQuery] = useState<string>('');

  const {
    setSelectedErrandStatuses,
    selectedErrandStatuses,
    setSidebarLabel,
    newErrands,
    ongoingErrands,
    assignedErrands,
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
        label: 'Nya ärenden',
        key: newStatuses[0],
        statuses: newStatuses,
        icon: 'inbox',
        totalStatusErrands: newErrands.totalElements,
      },
      {
        label: 'Öppnade ärenden',
        key: ErrandStatus.UnderGranskning,
        statuses: ongoingStatuses,
        icon: 'clipboard-pen',
        totalStatusErrands: ongoingErrands.totalElements,
      },
      ...(isSuspendEnabled()
        ? [
            {
              label: 'Parkerade ärenden',
              key: ErrandStatus.UnderRemiss,
              statuses: [ErrandStatus.UnderRemiss],
              icon: 'circle-pause',
              totalStatusErrands: 0,
            },
          ]
        : []),

      {
        label: 'Tilldelade ärenden',
        key: ErrandStatus.Tilldelat,
        statuses: [ErrandStatus.Tilldelat],
        icon: 'file-plus',
        totalStatusErrands: assignedErrands.totalElements,
      },
      {
        label: 'Avslutade ärenden',
        key: closedStatuses[0],
        statuses: closedStatuses,
        icon: 'circle-check-big',
        totalStatusErrands: closedErrands.totalElements,
      },
    ],
    [newErrands, ongoingErrands, assignedErrands, closedErrands]
  );

  return (
    <>
      {casedataSidebarButtons?.map((button) => {
        return (
          <Button
            onClick={() => {
              updateStatusFilter(button.statuses as ErrandStatus[]);
              setSidebarLabel(button.label);
            }}
            aria-label={`status-button-${button.key}`}
            variant={selectedErrandStatuses.map((s) => ErrandStatus[s]).includes(button.key) ? 'primary' : 'ghost'}
            className={`justify-start ${
              !selectedErrandStatuses.includes(button.key as ErrandStatus) && 'hover:bg-dark-ghost'
            }`}
            leftIcon={<LucideIcon name={button.icon as any} />}
            key={button.key}
          >
            <span className="w-full flex justify-between">
              {button.label}
              <Badge
                className="min-w-fit px-4"
                inverted={!selectedErrandStatuses.includes(button.key as ErrandStatus)}
                color={selectedErrandStatuses.includes(button.key as ErrandStatus) ? 'tertiary' : 'vattjom'}
                counter={button.totalStatusErrands || '0'}
              />
            </span>
          </Button>
        );
      })}
    </>
  );
};
