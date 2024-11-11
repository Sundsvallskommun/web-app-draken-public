import { SidebarButton } from '@common/interfaces/sidebar-button';
import { useAppContext } from '@contexts/app.context';
import { Badge, Button } from '@sk-web-gui/react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CaseStatusFilter } from './casedata-filter-status.component';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import LucideIcon from '@sk-web-gui/lucide-icon';
import store from '@supportmanagement/services/storage-service';

export const CasedataFilterSidebarStatusSelector: React.FC = () => {
  const { register } = useFormContext<CaseStatusFilter>();
  const [query, setQuery] = useState<string>('');

  const {
    setSelectedErrandStatuses,
    selectedErrandStatuses,
    sidebarButtons,
  }: { setSelectedErrandStatuses; selectedErrandStatuses: ErrandStatus[]; sidebarButtons: SidebarButton[] } =
    useAppContext();

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

  return (
    <>
      {sidebarButtons?.map((button) => {
        return (
          <Button
            onClick={() => {
              updateStatusFilter(button.statuses as ErrandStatus[]);
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
