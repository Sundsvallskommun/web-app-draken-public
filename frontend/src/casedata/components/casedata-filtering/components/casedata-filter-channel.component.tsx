import { Channels } from '@casedata/interfaces/channels';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Checkbox, PopupMenu } from '@sk-web-gui/react';
import { useFormContext } from 'react-hook-form';

export interface CaseChannelFilter {
  channel: string[];
}

export const CaseChannelValues = {
  channel: [],
};

export const CasedataFilterChannel: React.FC = () => {
  const { register } = useFormContext<CaseChannelFilter>();

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="Channel-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Kanal
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full">
        <PopupMenu.Items autoFocus={false}>
          {Object.entries(Channels).map((c: [string, string], idx) => (
            <PopupMenu.Item key={`${c[1]}-${idx}`}>
              <Checkbox labelPosition="left" value={c[0]} {...register('channel')} data-cy={`channel-filter-${c[0]}`}>
                {c[1]}
              </Checkbox>
            </PopupMenu.Item>
          ))}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
