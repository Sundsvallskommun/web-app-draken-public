import LucideIcon from '@sk-web-gui/lucide-icon';
import { Link, PopupMenu } from '@sk-web-gui/react';
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
              <PopupMenu.Button className="justify-between w-full" leftIcon={<LucideIcon name="palette" />}>
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
            <Link key={'logout'} href={`${process.env.NEXT_PUBLIC_API_URL}/saml/logout`} className={`usermenu-item`}>
              <span className="inline">Logga ut</span>
            </Link>
          </PopupMenu.Item>
        ),
      },
    ],
  },
];
