import { Checkbox, PopupMenu } from '@sk-web-gui/react';
import { useUiSettingsStore } from '@stores/ui-settings-store';
import { Hammer } from 'lucide-react';

/**
 * Turns demo mode on and off. Demo mode marks the application as a work in progress -
 * see UnderConstructionBanner - and is remembered per user in the same persisted UI
 * settings as the colour scheme.
 *
 * The Checkbox is the direct child of PopupMenu.Item, as in ColorSchemeItems: the menu
 * clones its child with size and disabled, and leaves the panel open for an <input>.
 */
export const DemoModeItem = () => {
  const demoMode = useUiSettingsStore((s) => s.demoMode);
  const setDemoMode = useUiSettingsStore((s) => s.setDemoMode);

  return (
    <PopupMenu.Item>
      <Checkbox data-cy="demo-mode-toggle" checked={demoMode} onChange={(event) => setDemoMode(event.target.checked)}>
        Demoläge <Hammer className={demoMode ? '' : 'opacity-50'} />
      </Checkbox>
    </PopupMenu.Item>
  );
};
