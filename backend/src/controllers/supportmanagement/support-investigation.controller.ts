import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Investigation, InvestigationSection } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { readJsonParameters, WithJsonParameters, writeJsonParameter, WriteSupportJsonParameterDto } from '@/services/support-json-parameter.service';
import { apiURL } from '@/utils/util';

const ACTIVE_STATUS = 'ACTIVE';
const COMPLETED_STATUS = 'COMPLETED';
const PENDING_ASSESSMENT = 'PENDING';
const ASSESSMENTS = [PENDING_ASSESSMENT, 'APPROVED', 'DEFICIENCY', 'NOT_APPLICABLE'];

export class CreateSupportInvestigationSectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  sectionKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  heading!: string;

  @IsInt()
  sortOrder!: number;
}

export class CreateSupportInvestigationDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupportInvestigationSectionDto)
  sections!: CreateSupportInvestigationSectionDto[];
}

export class UpdateSupportInvestigationDto {
  @IsInt()
  version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8192)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8192)
  conclusion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  recommendation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8192)
  recommendationMotivation?: string;
}

export class CompleteSupportInvestigationSectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupportInvestigationSectionDto)
  sections!: CreateSupportInvestigationSectionDto[];
}

export class UpdateSupportInvestigationSectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(8192)
  text?: string;

  @IsOptional()
  @IsIn(ASSESSMENTS)
  assessment?: string;
}

type SupportInvestigationResponse = WithJsonParameters<Omit<Investigation, 'sections'>> & {
  sections: WithJsonParameters<InvestigationSection>[];
};

@Controller()
export class SupportInvestigationController {
  private readonly apiService = new ApiService();
  private readonly namespace = SUPPORTMANAGEMENT_NAMESPACE;
  private readonly SERVICE = apiServiceName('supportmanagement');

  private readonly investigationsUrl = (municipalityId: string, errandId: string): string =>
    `${municipalityId}/${this.namespace}/errands/${errandId}/investigations`;

  private readonly investigationUrl = (municipalityId: string, errandId: string, investigationId: string): string =>
    `${this.investigationsUrl(municipalityId, errandId)}/${investigationId}`;

  // The JSON parameters are kept beside the investigation and each section, so they are read one by one.
  private async withJsonParameters(
    municipalityId: string,
    errandId: string,
    investigation: Investigation,
    user: RequestWithUser['user'],
  ): Promise<SupportInvestigationResponse> {
    const url = this.investigationUrl(municipalityId, errandId, investigation.id ?? '');
    const [jsonParameters, sections] = await Promise.all([
      readJsonParameters(this.apiService, url, user),
      Promise.all(
        (investigation.sections ?? []).map(async section => ({
          ...section,
          jsonParameters: await readJsonParameters(this.apiService, `${url}/sections/${section.id}`, user),
        })),
      ),
    ]);
    return { ...investigation, jsonParameters, sections };
  }

  private async readInvestigations(municipalityId: string, errandId: string, user: RequestWithUser['user']): Promise<SupportInvestigationResponse[]> {
    const res = await this.apiService.get<Investigation[]>(
      { url: this.investigationsUrl(municipalityId, errandId), baseURL: apiURL(this.SERVICE), propagateClientError: true },
      user,
    );
    return Promise.all((res.data ?? []).map(investigation => this.withJsonParameters(municipalityId, errandId, investigation, user)));
  }

  private async readInvestigation(
    municipalityId: string,
    errandId: string,
    investigationId: string,
    user: RequestWithUser['user'],
  ): Promise<SupportInvestigationResponse> {
    const res = await this.apiService.get<Investigation>(
      {
        url: this.investigationUrl(municipalityId, errandId, investigationId),
        baseURL: apiURL(this.SERVICE),
        propagateClientError: true,
      },
      user,
    );
    return this.withJsonParameters(municipalityId, errandId, res.data, user);
  }

  @Get('/supportinvestigations/:municipalityId/:id')
  @OpenAPI({ summary: 'Get the investigations of a support errand' })
  @UseBefore(authMiddleware)
  async fetchInvestigations(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }
    return response.status(200).send(await this.readInvestigations(municipalityId, id, req.user));
  }

  @Post('/supportinvestigations/:municipalityId/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Start the investigation of a support errand, with a section per examination' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(CreateSupportInvestigationDto, 'body'))
  async createInvestigation(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: CreateSupportInvestigationDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const [existing] = await this.readInvestigations(municipalityId, id, req.user);
    if (existing?.id) {
      const protocol = {
        ...(data.type && { type: data.type }),
        ...(data.title && { title: data.title }),
      };
      if (Object.keys(protocol).length === 0) {
        return response.status(200).send(existing);
      }
      await this.apiService.patch<Investigation, Partial<Investigation>>(
        {
          url: `${this.investigationsUrl(municipalityId, id)}/${existing.id}`,
          baseURL: apiURL(this.SERVICE),
          data: protocol,
          headers: { 'If-Match': `"${existing.version ?? 0}"` },
          propagateClientError: true,
        },
        req.user,
      );
      return response.status(200).send(await this.readInvestigation(municipalityId, id, existing.id, req.user));
    }

    const baseURL = apiURL(this.SERVICE);
    const created = await this.apiService.post<Investigation, Investigation>(
      {
        url: this.investigationsUrl(municipalityId, id),
        baseURL,
        data: {
          status: ACTIVE_STATUS,
          startedAt: new Date().toISOString(),
          investigatorUserId: req.user.username,
          ...(data.type && { type: data.type }),
          ...(data.title && { title: data.title }),
        },
        propagateClientError: true,
      },
      req.user,
    );

    const investigationId = created.data?.id;
    if (!investigationId) {
      throw new HttpException(502, 'Support Management did not return the investigation that was written');
    }

    for (const section of data.sections) {
      await this.apiService.post<InvestigationSection, InvestigationSection>(
        {
          url: `${this.investigationsUrl(municipalityId, id)}/${investigationId}/sections`,
          baseURL,
          data: { ...section, assessment: PENDING_ASSESSMENT },
          propagateClientError: true,
        },
        req.user,
      );
    }

    return response.status(201).send(await this.readInvestigation(municipalityId, id, investigationId, req.user));
  }

  @Post('/supportinvestigations/:municipalityId/:id/:investigationId/sections')
  @OpenAPI({ summary: 'Write the examinations an investigation has no section for, and leave the rest alone' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(CompleteSupportInvestigationSectionsDto, 'body'))
  async completeInvestigationSections(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('investigationId') investigationId: string,
    @Body() data: CompleteSupportInvestigationSectionsDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const investigation = await this.readInvestigation(municipalityId, id, investigationId, req.user);
    const written = (investigation?.sections ?? []).map(section => section.sectionKey);
    const missing = data.sections.filter(section => !written.includes(section.sectionKey));

    if (missing.length === 0) {
      return response.status(200).send(investigation);
    }

    for (const section of missing) {
      await this.apiService.post<InvestigationSection, InvestigationSection>(
        {
          url: `${this.investigationsUrl(municipalityId, id)}/${investigationId}/sections`,
          baseURL: apiURL(this.SERVICE),
          data: { ...section, assessment: PENDING_ASSESSMENT },
          propagateClientError: true,
        },
        req.user,
      );
    }

    return response.status(200).send(await this.readInvestigation(municipalityId, id, investigationId, req.user));
  }

  @Patch('/supportinvestigations/:municipalityId/:id/:investigationId')
  @OpenAPI({ summary: 'Update the investigation of a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportInvestigationDto, 'body'))
  async updateInvestigation(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('investigationId') investigationId: string,
    @Body() data: UpdateSupportInvestigationDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const { version, ...investigation } = data;
    await this.apiService.patch<Investigation, Partial<Investigation>>(
      {
        url: `${this.investigationsUrl(municipalityId, id)}/${investigationId}`,
        baseURL: apiURL(this.SERVICE),
        data: investigation,
        headers: { 'If-Match': `"${version}"` },
        propagateClientError: true,
      },
      req.user,
    );

    return response.status(200).send(await this.readInvestigation(municipalityId, id, investigationId, req.user));
  }

  @Patch('/supportinvestigations/:municipalityId/:id/:investigationId/complete')
  @OpenAPI({ summary: 'Conclude the investigation of a support errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportInvestigationDto, 'body'))
  async completeInvestigation(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('investigationId') investigationId: string,
    @Body() data: UpdateSupportInvestigationDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const { version, ...investigation } = data;
    await this.apiService.patch<Investigation, Partial<Investigation>>(
      {
        url: `${this.investigationsUrl(municipalityId, id)}/${investigationId}`,
        baseURL: apiURL(this.SERVICE),
        data: { ...investigation, status: COMPLETED_STATUS, completedAt: new Date().toISOString() },
        headers: { 'If-Match': `"${version}"` },
        propagateClientError: true,
      },
      req.user,
    );

    return response.status(200).send(await this.readInvestigation(municipalityId, id, investigationId, req.user));
  }

  @Patch('/supportinvestigations/:municipalityId/:id/:investigationId/sections/:sectionId')
  @OpenAPI({ summary: 'Update one examination of an investigation' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(UpdateSupportInvestigationSectionDto, 'body'))
  async updateSection(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('investigationId') investigationId: string,
    @Param('sectionId') sectionId: string,
    @Body() data: UpdateSupportInvestigationSectionDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const assessed = data.assessment && data.assessment !== PENDING_ASSESSMENT;
    await this.apiService.patch<InvestigationSection, Partial<InvestigationSection>>(
      {
        url: `${this.investigationsUrl(municipalityId, id)}/${investigationId}/sections/${sectionId}`,
        baseURL: apiURL(this.SERVICE),
        data: {
          ...data,
          ...(assessed && { completedBy: req.user.username, completedAt: new Date().toISOString() }),
        },
        propagateClientError: true,
      },
      req.user,
    );

    return response.status(200).send(await this.readInvestigation(municipalityId, id, investigationId, req.user));
  }

  @Put('/supportinvestigations/:municipalityId/:id/:investigationId/json-parameters/:key')
  @OpenAPI({ summary: 'Write a JSON parameter of the investigation, such as the answers of an inspection protocol' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(WriteSupportJsonParameterDto, 'body'))
  async writeInvestigationJsonParameter(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('investigationId') investigationId: string,
    @Param('key') key: string,
    @Body() data: WriteSupportJsonParameterDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    await writeJsonParameter(this.apiService, this.investigationUrl(municipalityId, id, investigationId), key, data, req.user);
    return response.status(200).send(await this.readInvestigation(municipalityId, id, investigationId, req.user));
  }

  @Put('/supportinvestigations/:municipalityId/:id/:investigationId/sections/:sectionId/json-parameters/:key')
  @OpenAPI({ summary: 'Write a JSON parameter of one examination of an investigation' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']), validationMiddleware(WriteSupportJsonParameterDto, 'body'))
  async writeSectionJsonParameter(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Param('investigationId') investigationId: string,
    @Param('sectionId') sectionId: string,
    @Param('key') key: string,
    @Body() data: WriteSupportJsonParameterDto,
    @Res() response: any,
  ): Promise<any> {
    if (municipalityId !== MUNICIPALITY_ID) {
      return response.status(400).send('Invalid municipality id');
    }

    const sectionUrl = `${this.investigationUrl(municipalityId, id, investigationId)}/sections/${sectionId}`;
    await writeJsonParameter(this.apiService, sectionUrl, key, data, req.user);
    return response.status(200).send(await this.readInvestigation(municipalityId, id, investigationId, req.user));
  }
}
