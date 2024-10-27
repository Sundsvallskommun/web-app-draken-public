import { LucideIcon as Icon, Link, PopupMenu } from '@sk-web-gui/react';
import { ColorSchemeItems } from './color-scheme-items.component';

export const userMenuGroups = [
  // {
  //   label: 'Main',
  //   showLabel: false,
  //   showOnDesktop: false,
  //   showOnMobile: true,
  //   elements: [
  //     {
  //       label: 'Översikt',
  //       element: (active: boolean) => (
  //         <Link
  //           key={'oversikt'}
  //           href={`${process.env.NEXT_PUBLIC_BASEPATH}/oversikt`}
  //           className={`usermenu-item ${active ? 'active' : ''} block lg:hidden`}
  //         >
  //           Översikt
  //         </Link>
  //       ),
  //     },
  //   ],
  // },
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
              <PopupMenu.Button className="justify-between w-full" leftIcon={<Icon name="palette" />}>
                <span className="w-full flex justify-between">
                  Färgläge
                  <Icon name="chevron-right" />
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
              <span className="material-icons-outlined align-middle mr-sm" aria-hidden="true">
                logout
              </span>
              <span className="inline">Logga ut</span>
            </Link>
          </PopupMenu.Item>
        ),
      },
    ],
  },
];
