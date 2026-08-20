import { SidebarButtonKey } from '@common/components/sidebar/sidebar.component';

export const mockSidebarButtons: {
  label: string;
  key: SidebarButtonKey;
}[] = [
  {
    label: 'Handläggning',
    key: 'info',
  },
  {
    label: 'Kommentarer',
    key: 'comments',
  },
  {
    label: 'Ärendelogg',
    key: 'history',
  },
];
