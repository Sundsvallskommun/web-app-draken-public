import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { Status } from '@supportmanagement/services/support-errand-service';

export interface SidebarButton {
  label: string;
  key: Status | ErrandStatus;
  statuses: readonly Status[] | readonly ErrandStatus[];
  icon: string;
  totalStatusErrands: number | null;
}
