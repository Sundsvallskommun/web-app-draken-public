import { Sidebar, SidebarButtonKey } from '@common/components/sidebar/sidebar.component';
import { SidebarComments } from './sidebar-comments.component';
import { SidebarHistory } from './sidebar-history.component';
import { SidebarInfo } from './sidebar-info.component';

export const SidebarWrapper: React.FC<{}> = () => {
  const buttons: {
    label: string;
    key: SidebarButtonKey;
    icon: string;
    component: React.ReactNode;
  }[] = [
    {
      label: 'Handläggning',
      key: 'info',
      icon: 'user-cog',
      component: <SidebarInfo />,
    },
    {
      label: 'Kommentarer',
      key: 'comments',
      icon: 'message-circle',
      component: <SidebarComments />,
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
