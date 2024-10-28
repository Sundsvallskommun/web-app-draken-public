import { SidebarButton } from '@common/interfaces/sidebar-button';
import { useAppContext } from '@contexts/app.context';
import { Badge, Button, LucideIcon as Icon } from '@sk-web-gui/react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface CaseStatusFilter {
  status: string[];
}

export const CaseStatusValues = {
  status: [],
};

export const CasedataFilterStatus: React.FC = () => {
  const { register } = useFormContext<CaseStatusFilter>();
  const [query, setQuery] = useState<string>('');

  const {
    setSelectedErrandStatuses,
    selectedErrandStatuses,
    sidebarButtons,
  }: { setSelectedErrandStatuses; selectedErrandStatuses: string[]; sidebarButtons: SidebarButton[] } = useAppContext();

  const updateStatusFilter = (ss: string[]) => {
    alert(`tab, ${ss}`);
  };

  return (
    <>
      {sidebarButtons?.map((button) => {
        return (
          <Button
            onClick={() => {
              updateStatusFilter(button.statuses);
            }}
            aria-label={`status-button-${button.key}`}
            variant={selectedErrandStatuses.includes(button.key) ? 'primary' : 'ghost'}
            className={`justify-start ${!selectedErrandStatuses.includes(button.key) && 'hover:bg-dark-ghost'}`}
            leftIcon={<Icon name={button.icon as any} />}
            key={button.key}
          >
            <span className="w-full flex justify-between">
              {button.label}
              <Badge
                className="min-w-fit px-4"
                inverted={!selectedErrandStatuses.includes(button.key)}
                color={selectedErrandStatuses.includes(button.key) ? 'tertiary' : 'vattjom'}
                counter={button.totalStatusErrands || '0'}
              />
            </span>
          </Button>
        );
      })}
    </>
  );
};
