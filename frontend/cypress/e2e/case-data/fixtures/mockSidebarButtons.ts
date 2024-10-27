import { SidebarButtonKey } from '@common/components/sidebar/sidebar.component';

export const mockSidebarButtons: {
  label: string;
  key: SidebarButtonKey;
}[] = [
  {
    label: 'Information',
    key: 'info',
  },
  {
    label: 'Tjänsteanteckningar',
    key: 'notes',
  },
  {
    label: 'Kommentarer',
    key: 'comments',
  },
  {
    label: 'Guider',
    key: 'guides',
  },
  {
    label: 'Utredning',
    key: 'investigation',
  },
  {
    label: 'Ärendelogg',
    key: 'history',
  },
];
