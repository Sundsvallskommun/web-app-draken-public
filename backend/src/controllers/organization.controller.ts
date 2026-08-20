import authMiddleware from '@middlewares/auth.middleware';
import { Controller, Get, Param, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { OrganizationTree } from '@/data-contracts/company/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import ApiService from '@/services/api.service';

interface OrgLeafNodeDTO {
  orgId: number;
  orgName: string;
  parentId?: number;
}

@Controller()
export class OrganizationController {
  private apiService = new ApiService();
  private COMPANY_SERVICE = apiServiceName('company');

  @Get('/organization/:orgId/orgtree')
  @OpenAPI({ summary: 'Get organization tree from orgId' })
  @UseBefore(authMiddleware)
  async getOrgTree(@Req() req: RequestWithUser, @Param('orgId') orgId: number, @Res() response: any): Promise<any> {
    try {
      const url = `${this.COMPANY_SERVICE}/${MUNICIPALITY_ID}/${orgId}/orgtree`;
      const res = await this.apiService.get<OrganizationTree>({ url }, req.user);
      return response.send({ data: res.data || null, message: 'success' });
    } catch (error: any) {
      console.error('Failed to get org tree:', error);
      return response.send({ data: null, message: 'success' });
    }
  }

  @Get('/organization/:orgId/leafnodes')
  @OpenAPI({ summary: 'Get leaf nodes from organization tree' })
  @UseBefore(authMiddleware)
  async getLeafNodes(@Req() req: RequestWithUser, @Param('orgId') orgId: number, @Res() response: any): Promise<any> {
    try {
      const url = `${this.COMPANY_SERVICE}/${MUNICIPALITY_ID}/${orgId}/orgtree`;
      const res = await this.apiService.get<OrganizationTree>({ url }, req.user);

      if (!res.data) {
        return response.send({ data: [], message: 'success' });
      }

      const leafNodes = this.flattenToLeafNodes(res.data);
      return response.send({ data: leafNodes, message: 'success' });
    } catch (error: any) {
      console.error('Failed to get leaf nodes:', error);
      return response.send({ data: [], message: 'success' });
    }
  }

  private flattenToLeafNodes(node: OrganizationTree): OrgLeafNodeDTO[] {
    const leafNodes: OrgLeafNodeDTO[] = [];

    const traverse = (n: OrganizationTree) => {
      if (n.isLeafLevel && n.orgId && n.orgName) {
        leafNodes.push({
          orgId: n.orgId,
          orgName: n.orgName,
          parentId: n.parentId ?? undefined,
        });
      }
      if (n.organizations) {
        n.organizations.forEach(traverse);
      }
    };

    traverse(node);
    return leafNodes;
  }
}
