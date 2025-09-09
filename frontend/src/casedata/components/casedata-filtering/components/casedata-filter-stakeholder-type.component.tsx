import { Priority } from '@casedata/interfaces/priority';
import { PriorityComponent } from '@common/components/priority/priority.component';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Checkbox, PopupMenu } from '@sk-web-gui/react';
import { useFormContext } from 'react-hook-form';

export interface CaseStakeholderTypeFilter {
  stakeholderType: string[];
}

export const CaseStakeholderTypeValues = {
  stakeholderType: [],
};

export const CasedataStakeholderType: React.FC = () => {
  const { register } = useFormContext<CaseStakeholderTypeFilter>();

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="StakeholderType-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Ärendeägaretyp
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full">
        <PopupMenu.Items>
          <PopupMenu.Item key={`person-1`}>
            <Checkbox
              labelPosition="left"
              value={'PERSON'}
              {...register('stakeholderType')}
              data-cy={`StakeholderType-filter-PERSON`}
            >
              Privat
            </Checkbox>
          </PopupMenu.Item>
          <PopupMenu.Item key={`organization-2`}>
            <Checkbox
              labelPosition="left"
              value={'ORGANIZATION'}
              {...register('stakeholderType')}
              data-cy={`StakeholderType-ORGANIZATION`}
            >
              Företag/Förening
            </Checkbox>
          </PopupMenu.Item>
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
