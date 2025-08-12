import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, PopupMenu } from '@sk-web-gui/react';
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
                <LucideIcon name="palette" />
                <span className="w-full flex justify-between">
                  Färgläge
                  <LucideIcon name="chevron-right" />
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
                window.location.assign(`${process.env.NEXT_PUBLIC_BASEPATH}/logout`);
              }}
            >
              <LucideIcon name="log-out" />
              <span>Logga ut</span>
            </Button>
          </PopupMenu.Item>
        ),
      },
    ],
  },
];
