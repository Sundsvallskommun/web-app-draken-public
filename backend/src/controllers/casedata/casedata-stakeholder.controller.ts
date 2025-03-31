import { CASEDATA_NAMESPACE, MUNICIPALITY_ID } from '@/config';
import { Errand as ErrandDTO, Stakeholder as StakeholderDTO } from '@/data-contracts/case-data/data-contracts';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import { RequestWithUser } from '@interfaces/auth.interface';
import { CreateStakeholderDto } from '@interfaces/stakeholder.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

interface ResponseData {
  data: StakeholderDTO[];
  message: string;
}

@Controller()
export class CasedataStakeholderController {
  private apiService = new ApiService();
  SERVICE = `case-data/11.0`;

  @Patch('/casedata/:municipalityId/errands/:errandId/stakeholders/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Update a stakeholder by stakeholder id' })
  @UseBefore(authMiddleware, validationMiddleware(CreateStakeholderDto, 'body'))
  async editStakeholder(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('id') stakeholderId: number,
    @Param('municipalityId') municipalityId: string,
    @Body() stakeholderData: CreateStakeholderDto,
  ): Promise<{ data: CreateStakeholderDto; message: string }> {
    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/stakeholders/${stakeholderId}`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.patch<any, CreateStakeholderDto>({ url, baseURL, data: stakeholderData }, req.user).catch(e => {
      logger.error('Error when adding stakeholder:', e);
      throw e;
    });
    return { data: response.data, message: `Stakeholder ${stakeholderId} edited` };
  }

  @Delete('/casedata/:municipalityId/errands/:id/stakeholders/:stakeholderId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Remove a stakeholder from an errand by id' })
  @UseBefore(authMiddleware)
  async removeStakeholder(
    @Req() req: RequestWithUser,
    @Param('id') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Param('stakeholderId') stakeholderId: string,
  ): Promise<{ data: ErrandDTO; message: string }> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/stakeholders/${stakeholderId}`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.delete<ErrandDTO>({ url, baseURL }, req.user).catch(e => {
      logger.error('Something went wrong when deleting stakeholder');
      logger.error(e);
      throw e;
    });
    return { data: response.data, message: `Stakeholder removed from errand ${errandId}` };
  }

  @Get('/casedata/:municipalityId/errands/:errandId/stakeholders/:id')
  @OpenAPI({ summary: 'Return a stakeholder by id' })
  @UseBefore(authMiddleware)
  async getStakeholder(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('errandId') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<ResponseData> {
    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errandId}/stakeholders/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const res = await this.apiService.get<StakeholderDTO[]>({ url, baseURL }, req.user);
    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Patch('/casedata/:municipalityId/errands/:errandId/stakeholders')
  @HttpCode(201)
  @OpenAPI({ summary: 'Add a stakeholder to an errand by id' })
  @UseBefore(authMiddleware, validationMiddleware(CreateStakeholderDto, 'body'))
  async newStakeholder(
    @Req() req: RequestWithUser,
    @Param('errandId') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Body() stakeholderData: CreateStakeholderDto,
  ): Promise<{ data: ErrandDTO; message: string }> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${errandId}/stakeholders`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService.patch<ErrandDTO, StakeholderDTO>({ url, baseURL, data: stakeholderData }, req.user).catch(e => {
      logger.error('Something went wrong when patching stakeholder');
      logger.error(e);
      throw e;
    });
    return { data: response.data, message: `Stakeholder created on errand ${errandId}` };
  }

  @Post('/casedata/:municipalityId/stakeholders/personNumber')
  @OpenAPI({ summary: 'Return a personnumber by personId' })
  @UseBefore(authMiddleware)
  async getPersonNumber(
    @Req() req: RequestWithUser,
    @Res() response: any,
    @Param('municipalityId') municipalityId: string,
    @Body() body: { personId: string },
  ): Promise<{ data: string; message: string }> {
    const url = `citizen/3.0/${MUNICIPALITY_ID}/${body.personId}/personnumber`;
    const personalNumber = await this.apiService
      .get<string>({ url }, req.user)
      .then(res => {
        return res.data;
      })
      .catch(e => undefined);
    return personalNumber ? { data: personalNumber, message: 'success' } : { data: undefined, message: '404' };
  }
}
