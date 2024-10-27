import { Sidebar, SidebarButtonKey } from '../../../../common/components/sidebar/sidebar.component';
import { SidebarComments } from './sidebar-comments.component';
import { SidebarGuide } from './sidebar-guide.component';
import { SidebarHistory } from './sidebar-history.component';
import { SidebarInfo } from './sidebar-info.component';
import { SidebarNotes } from './sidebar-notes.component';
import { SidebarUtredning } from './sidebar-utredning.component';

export const SidebarWrapper = () => {
  const buttons: {
    label: string;
    key: SidebarButtonKey;
    icon: string;
    component: React.ReactNode;
  }[] = [
    {
      label: 'Information',
      key: 'info',
      icon: 'info',
      component: <SidebarInfo />,
    },
    {
      label: 'Tjänsteanteckningar',
      key: 'notes',
      icon: 'pencil-line',
      component: <SidebarNotes />,
    },
    {
      label: 'Kommentarer',
      key: 'comments',
      icon: 'message-circle',
      component: <SidebarComments />,
    },
    {
      label: 'Guider',
      key: 'guides',
      icon: 'book',
      component: <SidebarGuide />,
    },
    {
      label: 'Utredning',
      key: 'investigation',
      icon: 'text-select',
      component: <SidebarUtredning />,
    },
    {
      label: 'Ärendelogg',
      key: 'history',
      icon: 'history',
      component: <SidebarHistory />,
    },
  ];

  return <Sidebar buttons={buttons} />;
};
