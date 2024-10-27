import { SidebarGenericNotes } from './sidebar-generic-notes.component';

export const SidebarComments: React.FC<{}> = () => (
  <SidebarGenericNotes label_plural={'Kommentarer'} label_singular={'Kommentar'} noteType={'INTERNAL'} />
);
