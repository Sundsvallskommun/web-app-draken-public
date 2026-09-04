import { Sidebar, SidebarButtonKey } from '@common/components/sidebar/sidebar.component';
import { useSupportStore } from '@stores/index';
import { supportErrandIsEmpty } from '@supportmanagement/services/support-errand-service';
import { Dispatch, FC, ReactNode, SetStateAction } from 'react';

import { SidebarComments } from './sidebar-comments.component';
import { SidebarHistory } from './sidebar-history.component';
import { SidebarInfo } from './sidebar-info.component';
import { SidebarSupportExport } from './sidebar-support-export.component';

export const SidebarWrapper: FC<{
  setUnsavedFacility?: Dispatch<SetStateAction<boolean>>;
  unsavedFacility: boolean;
}> = (props) => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const buttons: {
    label: string;
    key: SidebarButtonKey;
    icon: string;
    component: ReactNode;
  }[] = [
    {
      label: 'Handläggning',
      key: 'info',
      icon: 'user-cog',
      component: <SidebarInfo unsavedFacility={props.unsavedFacility} setUnsavedFacility={props.setUnsavedFacility!} />,
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
    {
      label: 'Exportera ärende',
      key: 'supportexport',
      icon: 'file-output',
      component: <SidebarSupportExport />,
    },
  ];

  return <Sidebar buttons={buttons} errandIsUnsaved={supportErrandIsEmpty(supportErrand!)} />;
};
