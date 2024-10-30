import { useAppContext } from '@contexts/app.context';
import { LucideIcon as Icon, Button, Badge } from '@sk-web-gui/react';
import { SidebarButton } from '@common/interfaces/sidebar-button';
import store from '@supportmanagement/services/storage-service';
import { Status } from '@supportmanagement/services/support-errand-service';

export interface SupportManagementStatusFilter {
  status: Status[];
}

export const SupportManagementStatusValues = {
  status: [],
};

export const SupportManagementFilterStatus: React.FC<{
  showAttestationTable;
  setShowAttestationTable;
}> = ({ showAttestationTable, setShowAttestationTable }) => {
  const {
    setSelectedErrandStatuses,
    selectedErrandStatuses,
    sidebarButtons,
  }: { setSelectedErrandStatuses; selectedErrandStatuses: Status[]; sidebarButtons: SidebarButton[] } = useAppContext();

  const updateStatusFilter = (ss: Status[]) => {
    try {
      const storedFilter = store.get('filter');
      const jsonparsedstatus = JSON.parse(storedFilter);
      const status = ss.join(',');
      jsonparsedstatus.status = status;
      const stringified = JSON.stringify(jsonparsedstatus);
      store.set('filter', stringified);
      setSelectedErrandStatuses(ss);
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
              updateStatusFilter(button.statuses as Status[]);
              setShowAttestationTable(false);
            }}
            aria-label={`status-button-${button.key}`}
            variant={
              selectedErrandStatuses.includes(button.key as Status) && !showAttestationTable ? 'primary' : 'ghost'
            }
            className={`justify-start ${
              !selectedErrandStatuses.includes(button.key as Status) && 'hover:bg-dark-ghost'
            }`}
            leftIcon={<Icon name={button.icon as any} />}
            key={button.key}
          >
            <span className="w-full flex justify-between">
              {button.label}
              <Badge
                className="min-w-fit px-4"
                inverted={!selectedErrandStatuses.includes(button.key as Status) || showAttestationTable}
                color={
                  selectedErrandStatuses.includes(button.key as Status) && !showAttestationTable
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
