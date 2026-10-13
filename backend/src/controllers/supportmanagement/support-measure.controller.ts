import { IsString, MaxLength, MinLength } from 'class-validator';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Measure } from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { apiURL } from '@/utils/util';

export class CreateSupportMeasureDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  type!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;
}

export class UpdateSupportMeasureDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;
}

const ADDED_BY_ROLE = 'PRIMARY';

@Controller()
export class SupportMeasureController {
  private readonly apiService = new ApiService();
  private readonly namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private readonly SERVICE = apiServiceName('supportmanagement');

  private readonly measuresUrl = (municipalityId: string, errandId: string): string =>
    `${municipalityId}/${this.namespace}/errands/${errandId}/measures`;

  @Get('/supportmeasures/:municipalityId/:id')
  @OpenAPI({ summary: 'Get the measures of a support errand' })
  @UseBefore(authMiddleware)
  async fetchMeasures(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    const res = await this.apiService.get<Measure[]>(
      { url: this.measuresUrl(municipalityId, id), baseURL: apiURL(this.SERVICE), propagateClientError: true },
      req.user,
    );
    return response.status(200).send(res.data ?? []);
  }

  @Post('/supportmeasures/:municipalityId/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Add a measure to a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(CreateSupportMeasureDto, 'body'))
  async createMeasure(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: CreateSupportMeasureDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    const res = await this.apiService.post<Measure, Measure>(
      {
        url: this.measuresUrl(municipalityId, id),
        baseURL: apiURL(this.SERVICE),
        data: { ...data, addedByUser: req.user.username, addedByRole: ADDED_BY_ROLE },
        propagateClientError: true,
      },
      req.user,
    );
    return response.status(201).send(res.data);
  }

  @Patch('/supportmeasures/:municipalityId/:id/:measureId')
  @OpenAPI({ summary: 'Update a measure of a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportMeasureDto, 'body'))
  async updateMeasure(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('measureId') measureId: string,
    @Body() data: UpdateSupportMeasureDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    const res = await this.apiService.patch<Measure, UpdateSupportMeasureDto>(
      {
        url: `${this.measuresUrl(municipalityId, id)}/${measureId}`,
        baseURL: apiURL(this.SERVICE),
        data,
        propagateClientError: true,
      },
      req.user,
    );
    return response.status(200).send(res.data);
  }

  @Delete('/supportmeasures/:municipalityId/:id/:measureId')
  @OpenAPI({ summary: 'Delete a measure of a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']))
  async deleteMeasure(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('measureId') measureId: string,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    await this.apiService.delete<void>(
      { url: `${this.measuresUrl(municipalityId, id)}/${measureId}`, baseURL: apiURL(this.SERVICE), propagateClientError: true },
      req.user,
    );
    return response.status(204).send();
  }
}
