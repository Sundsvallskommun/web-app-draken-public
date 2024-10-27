import { SidebarGenericNotes } from './sidebar-generic-notes.component';

export const SidebarNotes: React.FC<{}> = () => (
  <SidebarGenericNotes label_plural={'Tjänsteanteckningar'} label_singular={'Tjänsteanteckning'} noteType={'PUBLIC'} />
);
