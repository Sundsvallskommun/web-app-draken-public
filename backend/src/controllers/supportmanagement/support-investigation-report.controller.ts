import { IsBoolean, IsOptional } from 'class-validator';
import { Response } from 'express';
import FormData from 'form-data';
import { Body, Controller, Param, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

import { APPLICATION, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { getSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { trimSupportManagementPath } from '@/config/supportmanagement-path';
import { ErrandAttachmentChannelEnum } from '@/data-contracts/supportmanagement/data-contracts';
import type { DirectRenderRequest, RenderResponse } from '@/data-contracts/templating/data-contracts';
import { SupportInvestigationDocumentProfileDto, SupportInvestigationProfileDto } from '@/dtos/support-investigation-profile.dto';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { buildInvestigationReportModel, investigationReportFileName } from '@/services/investigation-report.service';
import { renderInvestigationReportTemplate } from '@/services/investigation-report.template';
import { isRecord, type JsonObject } from '@/services/schema-bound-json.service';
import { SupportInvestigationAccessService } from '@/services/support-investigation-access.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';
import { isDocumentCompleted, readDocumentCompletion, SupportJsonParameterService } from '@/services/support-json-parameter.service';

export class CreateSupportInvestigationReportDto {
  /** Render the PDF and return it without attaching it to the errand or recording it. */
  @IsOptional()
  @IsBoolean()
  preview?: boolean;
}

export interface SupportInvestigationReportEntry {
  readonly generatedAt: string;
  readonly generatedBy: string;
  readonly fileName: string;
  readonly attachmentId?: string;
}

type ReportApiService = Pick<ApiService, 'post'>;

export interface SupportInvestigationReportControllerDependencies {
  readonly investigationProfile?: SupportInvestigationProfileDto;
  readonly documentService?: SupportJsonParameterService;
  readonly policyService?: SupportInvestigationPolicyService;
  readonly accessService?: SupportInvestigationAccessService;
  readonly apiService?: ReportApiService;
  readonly namespace?: string;
  readonly supportManagementService?: string;
  readonly templatingService?: string;
  readonly clock?: () => Date;
}

const requireDefinition = (profile: SupportInvestigationProfileDto, key: string): SupportInvestigationDocumentProfileDto => {
  const definition = profile.documents.find(document => document.key === key);
  if (!definition) throw new HttpException(400, 'Unsupported investigation JSON parameter key');
  return definition;
};

const formatTimestamp = (iso: string): string => iso.replace('T', ' ').slice(0, 16);

const attachmentIdFrom = (data: unknown, location: unknown): string | undefined => {
  if (isRecord(data) && typeof data.id === 'string' && data.id.length > 0) return data.id;
  if (typeof location === 'string') {
    const match = location.match(/\/attachments\/([^/?#]+)/u);
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
};

/**
 * Renders one completed investigation document as a PDF from its own schema, and attaches it to
 * the errand as the next numbered report. Generating a report is the one write a completed,
 * locked document still accepts, and it is the BFF that makes it.
 */
@Controller()
export class SupportInvestigationReportController {
  private readonly investigationProfile: SupportInvestigationProfileDto;
  private readonly documentService: SupportJsonParameterService;
  private readonly policyService: SupportInvestigationPolicyService;
  private readonly accessService: SupportInvestigationAccessService;
  private readonly apiService: ReportApiService;
  private readonly namespace: string;
  private readonly supportManagementService: string;
  private readonly templatingService: string;
  private readonly clock: () => Date;

  constructor(dependencies: SupportInvestigationReportControllerDependencies = {}) {
    this.investigationProfile = dependencies.investigationProfile ?? getSupportInvestigationProfile(APPLICATION);
    this.documentService = dependencies.documentService ?? new SupportJsonParameterService({ namespace: SUPPORTMANAGEMENT_NAMESPACE ?? '' });
    this.policyService = dependencies.policyService ?? new SupportInvestigationPolicyService(undefined, this.investigationProfile);
    this.accessService = dependencies.accessService ?? new SupportInvestigationAccessService();
    this.apiService = dependencies.apiService ?? new ApiService();
    this.namespace = dependencies.namespace ?? SUPPORTMANAGEMENT_NAMESPACE ?? '';
    this.supportManagementService = trimSupportManagementPath(dependencies.supportManagementService ?? apiServiceName('supportmanagement'));
    this.templatingService = trimSupportManagementPath(dependencies.templatingService ?? apiServiceName('templating'));
    this.clock = dependencies.clock ?? (() => new Date());
  }

  @Post('/supporterrands/:municipalityId/:errandId/json-parameters/:key/reports')
  @OpenAPI({ summary: 'Render a completed investigation document as a PDF report and attach it to the errand' })
  @UseBefore(authMiddleware, validationMiddleware(CreateSupportInvestigationReportDto, 'body'))
  async createReport(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Param('errandId') errandId: string,
    @Param('key') key: string,
    @Body() body: CreateSupportInvestigationReportDto,
    @Res() response: Response,
  ): Promise<Response> {
    const definition = requireDefinition(this.investigationProfile, key);
    const state = await this.policyService.getState(req.user);
    if (state === 'unavailable') throw new HttpException(503, 'Investigation write policy is temporarily unavailable');
    if (state !== 'active') throw new HttpException(409, 'Investigation documents are not active for this application');

    const preview = body.preview === true;
    if (preview) await this.accessService.assertCanReadDocument(req.user, municipalityId, errandId, definition.key);
    else await this.accessService.assertCanWriteDocument(req.user, municipalityId, errandId, definition.key);

    const request = { definition, municipalityId, errandId, user: req.user };
    const stored = await this.documentService.readJsonParameter(request);
    const schema = await this.documentService.readBoundSchema(request, stored.document.schemaId);
    const completion = readDocumentCompletion(schema);
    if (!completion) throw new HttpException(409, 'This investigation document cannot be reported');
    if (!isDocumentCompleted(schema, stored.document.value)) {
      throw new HttpException(409, 'Mark the investigation as completed before generating a report');
    }

    const [uiSchema, parent] = await Promise.all([
      this.documentService.readUiSchema(request, stored.document.schemaId),
      this.documentService.readParentErrandWithVersion(request),
    ]);
    const existingReports = stored.document.value[completion.reportsField];
    const reports: SupportInvestigationReportEntry[] = Array.isArray(existingReports) ? (existingReports as SupportInvestigationReportEntry[]) : [];
    const sequence = reports.length + 1;
    const generatedAt = this.clock().toISOString();
    const fileName = investigationReportFileName(definition.tabLabel, sequence);
    const model = buildInvestigationReportModel({
      schema,
      uiSchema,
      value: stored.document.value,
      errand: parent.errand,
      definition,
      sequence,
      generatedAt: formatTimestamp(generatedAt),
      generatedBy: req.user.name || req.user.username,
    });

    const pdfBase64 = await this.renderPdf(req, municipalityId, model);
    if (preview) {
      return response.status(200).send({ data: { fileName, pdfBase64 }, message: 'Investigation report rendered' });
    }

    const attachmentId = await this.attachPdf(req, municipalityId, errandId, fileName, pdfBase64);
    const entry: SupportInvestigationReportEntry = { generatedAt, generatedBy: req.user.username, fileName, ...(attachmentId && { attachmentId }) };
    const written = await this.documentService.writeJsonParameter({
      ...request,
      data: { schemaId: stored.document.schemaId, value: stored.document.value },
      preconditions: { ifMatch: stored.etag, parentErrandVersion: String(parent.version) },
      internal: { serverOwnedOverrides: { [completion.reportsField]: [...reports, entry] as unknown as JsonObject[] }, allowLocked: true },
    });

    response.setHeader('ETag', written.etag);
    response.setHeader('X-Errand-Version', String(written.parentErrandVersion));
    return response.status(201).send({
      data: { document: written.document, report: entry },
      message: 'Investigation report attached',
    });
  }

  private async renderPdf(req: RequestWithUser, municipalityId: string, report: unknown): Promise<string> {
    const renderRequest: DirectRenderRequest = {
      content: Buffer.from(renderInvestigationReportTemplate(), 'utf8').toString('base64'),
      parameters: { report },
    };
    const rendered = await this.apiService.post<RenderResponse, DirectRenderRequest>(
      { url: `${this.templatingService}/${encodeURIComponent(municipalityId)}/render/direct/pdf`, data: renderRequest },
      req.user,
    );
    const output = rendered.data?.output;
    if (typeof output !== 'string' || output.length === 0) {
      throw new HttpException(502, 'Templating returned no PDF for the investigation report');
    }
    return output;
  }

  private async attachPdf(
    req: RequestWithUser,
    municipalityId: string,
    errandId: string,
    fileName: string,
    pdfBase64: string,
  ): Promise<string | undefined> {
    const data = new FormData();
    data.append('errandAttachment', Buffer.from(pdfBase64, 'base64'), { filename: fileName, contentType: 'application/pdf' });
    data.append('channel', ErrandAttachmentChannelEnum.WEB_UI);
    const url = `${this.supportManagementService}/${encodeURIComponent(municipalityId)}/${encodeURIComponent(this.namespace)}/errands/${encodeURIComponent(errandId)}/attachments`;
    const uploaded = await this.apiService.post<unknown, FormData>(
      { url, data, headers: { 'Content-Type': data.getHeaders()['content-type'] }, includeResponseHeaders: true, propagateClientError: true },
      req.user,
    );
    return attachmentIdFrom(uploaded.data, uploaded.headers?.location);
  }
}
