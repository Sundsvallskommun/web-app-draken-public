/* eslint-disable */
/* tslint:disable */
// @ts-nocheck

export interface OrganizationTree {
  /** @format int32 */
  orgId?: number;
  /** @format int32 */
  treeLevel?: number;
  orgName?: string | null;
  /** @format int32 */
  parentId?: number;
  isLeafLevel?: boolean;
  /** @format int32 */
  companyId?: number;
  responsibilityCode?: string | null;
  responsibilityList?: string | null;
  organizations?: OrganizationTree[] | null;
}
