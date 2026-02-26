import { AppChannels, Channels } from '@casedata/interfaces/channels';
import { Checkbox, PopupMenu } from '@sk-web-gui/react';
import { useFormContext } from 'react-hook-form';
import { ChevronDown } from 'lucide-react';

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
        rightIcon={<ChevronDown />}
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
          {Object.entries(Channels)
            .filter((c) => AppChannels[process.env.NEXT_PUBLIC_APPLICATION]?.includes(c[1]))
            .map((c: [string, string], idx) => (
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
