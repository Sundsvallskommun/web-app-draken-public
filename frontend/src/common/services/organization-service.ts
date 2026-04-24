import { ApiResponse, apiService } from '@common/services/api-service';

export interface OrgLeafNodeDTO {
  orgId: number;
  orgName: string;
  parentId?: number;
}

export const getOrgLeafNodes = async (orgId: number): Promise<OrgLeafNodeDTO[]> => {
  const res = await apiService.get<ApiResponse<OrgLeafNodeDTO[]>>(`organization/${orgId}/leafnodes`);
  return res.data.data || [];
};
