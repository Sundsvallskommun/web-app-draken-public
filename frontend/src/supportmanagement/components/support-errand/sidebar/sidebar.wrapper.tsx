import { Dispatch, SetStateAction } from 'react';
import { Sidebar, SidebarButtonKey } from '../../../../common/components/sidebar/sidebar.component';
import { SidebarComments } from './sidebar-comments.component';
import { SidebarHistory } from './sidebar-history.component';
import { SidebarInfo } from './sidebar-info.component';

export const SidebarWrapper: React.FC<{
  setUnsavedFacility?: Dispatch<SetStateAction<boolean>>;
  unsavedFacility: boolean;
  setShowMessageForm: Dispatch<SetStateAction<boolean>>;
}> = (props) => {
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
      component: (
        <SidebarInfo
          unsavedFacility={props.unsavedFacility}
          setUnsavedFacility={props.setUnsavedFacility}
          setShowMessageForm={() => props.setShowMessageForm(true)}
        />
      ),
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
