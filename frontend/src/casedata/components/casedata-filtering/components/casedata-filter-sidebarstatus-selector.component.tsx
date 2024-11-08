import { SidebarButton } from '@common/interfaces/sidebar-button';
import { useAppContext } from '@contexts/app.context';
import { Badge, Button } from '@sk-web-gui/react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CaseStatusFilter } from './casedata-filter-status.component';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import LucideIcon from '@sk-web-gui/lucide-icon';

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
    //NOTE: needs iplementation
    alert(`tab, ${ss}`);
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
            variant={selectedErrandStatuses.includes(button.key as ErrandStatus) ? 'primary' : 'ghost'}
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
