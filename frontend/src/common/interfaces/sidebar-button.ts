import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { Status } from '@supportmanagement/services/support-errand-service';

export interface SidebarButton {
  label: string;
  key: Status | ErrandStatus;
  statuses: Status[] | ErrandStatus[];
  icon: string;
  totalStatusErrands: number;
}
