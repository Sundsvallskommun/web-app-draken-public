import { AppChannels, Channels } from '@casedata/interfaces/channels';
import { Checkbox, PopupMenu } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

export interface CaseChannelFilter {
  channel: string[];
}

export const CaseChannelValues: CaseChannelFilter = {
  channel: [],
};

export const CasedataFilterChannel: FC = () => {
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
        Inkom via
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full">
        <PopupMenu.Items autoFocus={false}>
          {Object.entries(Channels)
            .filter((c) =>
              (AppChannels as Record<string, Channels[]>)[import.meta.env.VITE_APPLICATION ?? '']?.includes(c[1] as Channels)
            )
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
