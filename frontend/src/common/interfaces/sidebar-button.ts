export interface SidebarButton<Status extends string> {
  label: string;
  key: Status;
  statuses: readonly Status[];
  icon: string;
  totalStatusErrands: number | null;
}
