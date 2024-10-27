import { useGui } from '@sk-web-gui/react';
import { Dispatch, KeyboardEvent, SetStateAction, useRef, useState } from 'react';
import { useMediaQuery } from 'usehooks-ts';
import { Sidebar, SidebarButtonKey } from '../../../../common/components/sidebar/sidebar.component';
import { SidebarComments } from './sidebar-comments.component';
import { SidebarHistory } from './sidebar-history.component';
import { SidebarInfo } from './sidebar-info.component';

export const SidebarWrapper: React.FC<{
  setUnsavedFacility?: Dispatch<SetStateAction<boolean>>;
  unsavedFacility: boolean;
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
      component: <SidebarInfo unsavedFacility={props.unsavedFacility} setUnsavedFacility={props.setUnsavedFacility} />,
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
