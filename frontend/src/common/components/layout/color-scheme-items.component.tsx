import { PopupMenu, LucideIcon as Icon, RadioButton, useGui } from '@sk-web-gui/react';
import store from '@supportmanagement/services/storage-service';
import { useEffect } from 'react';

export const ColorSchemeItems = () => {
  const { setColorScheme, colorScheme } = useGui();

  useEffect(() => {
    const savedMode = store.get('colorScheme');
    if (savedMode) {
      setColorScheme(savedMode);
    }
  }, [setColorScheme]);

  const handleChangeColorScheme = (colorScheme) => {
    store.set('colorScheme', colorScheme);
    setColorScheme(colorScheme);
  };

  return (
    <PopupMenu.Items>
      <PopupMenu.Item>
        <RadioButton
          value={'light'}
          onClick={() => {
            handleChangeColorScheme('light');
          }}
          checked={colorScheme === 'light'}
        >
          Ljust <Icon name="sun" className={colorScheme === 'light' ? '' : 'opacity-50'} />
        </RadioButton>
      </PopupMenu.Item>
      <PopupMenu.Item>
        <RadioButton
          value={'dark'}
          onClick={() => {
            handleChangeColorScheme('dark');
          }}
          checked={colorScheme === 'dark'}
        >
          Mörkt <Icon name="moon" className={colorScheme === 'dark' ? '' : 'opacity-50'} />
        </RadioButton>
      </PopupMenu.Item>
      <PopupMenu.Item>
        <RadioButton
          value={'system'}
          onClick={() => {
            handleChangeColorScheme('system');
          }}
          checked={colorScheme === 'system'}
        >
          System <Icon name="monitor" className={colorScheme === 'system' ? '' : 'opacity-50'} />
        </RadioButton>
      </PopupMenu.Item>
    </PopupMenu.Items>
  );
};
