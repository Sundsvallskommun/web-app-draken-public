import { Priority } from '@casedata/interfaces/priority';
import { getPriorityColor } from '@casedata/services/casedata-errand-service';
import { Checkbox, LucideIcon as Icon, PopupMenu } from '@sk-web-gui/react';
import { useFormContext } from 'react-hook-form';

export interface CasePriorityFilter {
  priority: string[];
}

export const CasePriorityValues = {
  priority: [],
};

export const CasedataFilterPriority: React.FC = () => {
  const { register } = useFormContext<CasePriorityFilter>();

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<Icon name="chevron-down" />}
        data-cy="Prioritet-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Prio
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full">
        <PopupMenu.Items>
          {Object.entries(Priority).map((s: [string, string], idx) => (
            <PopupMenu.Item key={`${s[1]}-${idx}`}>
              <Checkbox
                labelPosition="left"
                value={s[0]}
                {...register('priority')}
                data-cy={`Prioritet-filter-${s[0]}`}
              >
                <span className="flex gap-12 items-center">
                  <Icon name="circle-dot" className={getPriorityColor(s[1] as Priority)} />

                  {s[1]}
                </span>
              </Checkbox>
            </PopupMenu.Item>
          ))}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};