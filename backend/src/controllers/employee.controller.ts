import authMiddleware from '@middlewares/auth.middleware';
import { Controller, Get, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Employeev2, Employment, PortalPersonData } from '@/data-contracts/employee/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import ApiService from '@/services/api.service';

interface UserEmploymentDTO {
  orgId?: number;
  orgName?: string;
  topOrgId?: number;
  isMainEmployment?: boolean;
  manager?: {
    personId?: string;
    givenname?: string;
    lastname?: string;
    emailAddress?: string;
  };
}

@Controller()
export class EmployeeController {
  private apiService = new ApiService();
  private EMPLOYEE_SERVICE = apiServiceName('employee');

  @Get('/employee/employments')
  @OpenAPI({ summary: 'Get current user employments with organization info' })
  @UseBefore(authMiddleware)
  async getEmployments(@Req() req: RequestWithUser, @Res() response: any): Promise<UserEmploymentDTO[]> {
    try {
      const personalUrl = `${this.EMPLOYEE_SERVICE}/${MUNICIPALITY_ID}/portalpersondata/PERSONAL/${req.user.username}`;
      const personalRes = await this.apiService.get<PortalPersonData>({ url: personalUrl }, req.user);

      if (!personalRes.data?.personid) {
        return response.send({ data: [], message: 'success' });
      }

      const personId = personalRes.data.personid;
      const employmentsUrl = `${this.EMPLOYEE_SERVICE}/${MUNICIPALITY_ID}/employments?PersonId=${personId}`;
      const res = await this.apiService.get<Employeev2[]>({ url: employmentsUrl }, req.user);

      const employees = res.data || [];
      if (employees.length === 0 || !employees[0]?.employments) {
        return response.send({ data: [], message: 'success' });
      }

      const employments = employees[0].employments
        .filter((emp: Employment) => emp.orgId && emp.orgName)
        .map(
          (emp: Employment): UserEmploymentDTO => ({
            orgId: emp.orgId,
            orgName: emp.orgName ?? undefined,
            topOrgId: emp.topOrgId,
            isMainEmployment: emp.isMainEmployment,
            manager: emp.manager
              ? {
                  personId: emp.manager.personId,
                  givenname: emp.manager.givenname ?? undefined,
                  lastname: emp.manager.lastname ?? undefined,
                  emailAddress: emp.manager.emailAddress ?? undefined,
                }
              : undefined,
          }),
        )
        .sort((a: UserEmploymentDTO, b: UserEmploymentDTO) => {
          if (a.isMainEmployment && !b.isMainEmployment) return -1;
          if (!a.isMainEmployment && b.isMainEmployment) return 1;
          return 0;
        });

      return response.send({ data: employments, message: 'success' });
    } catch (error: any) {
      console.error('Failed to get employments:', error);
      return response.send({ data: [], message: 'success' });
    }
  }
}
