export interface SidebarButton {
  label: string;
  key: string;
  statuses: readonly string[];
  icon: string;
  totalStatusErrands: number | null;
}
