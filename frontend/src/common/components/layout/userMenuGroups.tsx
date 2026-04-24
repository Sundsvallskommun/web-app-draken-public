import { Button, PopupMenu } from '@sk-web-gui/react';
import { ChevronRight, LogOut, Palette } from 'lucide-react';


import { ColorSchemeItems } from './color-scheme-items.component';

export const userMenuGroups = [
  {
    label: 'Annat',
    showLabel: false,
    showOnDesktop: true,
    showOnMobile: true,
    elements: [
      {
        label: 'Färgläge',
        element: () => (
          <PopupMenu.Item>
            <PopupMenu position="right" align="start">
              <PopupMenu.Button className="justify-between w-full">
                <Palette />
                <span className="w-full flex justify-between">
                  Färgläge
                  <ChevronRight />
                </span>
              </PopupMenu.Button>
              <PopupMenu.Panel>
                <ColorSchemeItems />
              </PopupMenu.Panel>
            </PopupMenu>
          </PopupMenu.Item>
        ),
      },
      {
        label: 'Logga ut',
        element: () => (
          <PopupMenu.Item>
            <Button
              type="button"
              className="usermenu-item w-full text-left inline-flex items-center gap-2"
              onClick={() => {
                window.location.assign(`${import.meta.env.VITE_BASEPATH}/logout`);
              }}
            >
              <LogOut />
              <span>Logga ut</span>
            </Button>
          </PopupMenu.Item>
        ),
      },
    ],
  },
];
