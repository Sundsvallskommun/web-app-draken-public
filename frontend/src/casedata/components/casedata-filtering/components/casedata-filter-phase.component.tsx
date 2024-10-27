import { Checkbox, LucideIcon as Icon, PopupMenu } from '@sk-web-gui/react';
import { useFormContext } from 'react-hook-form';
import { ErrandPhasePT } from '@casedata/interfaces/errand-phase';

export interface CasePhaseFilter {
  phase: string[];
}

export const CasePhaseValues = {
  phase: [],
};

export const CasedataFilterPhase: React.FC = () => {
  const { register } = useFormContext<CasePhaseFilter>();

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<Icon name="chevron-down" />}
        data-cy="Phase-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Fas
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full">
        <PopupMenu.Items autoFocus={false}>
          {Object.entries(ErrandPhasePT).map((s: [string, string], idx) => (
            <PopupMenu.Item key={`${s[1]}-${idx}`}>
              <Checkbox labelPosition="left" value={s[0]} {...register('phase')} data-cy={`phase-filter-${s[0]}`}>
                {s[1]}
              </Checkbox>
            </PopupMenu.Item>
          ))}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
