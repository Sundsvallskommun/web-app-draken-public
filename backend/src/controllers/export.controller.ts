import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { Errand, MessageResponse as IMessageResponse, Stakeholder } from '@/data-contracts/case-data/data-contracts';
import { RenderRequest, RenderResponse } from '@/data-contracts/templating/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import dayjs from 'dayjs';
import { Body, Controller, Param, Post, QueryParam, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { PROCESS_PARAMETER_KEYS } from './casedata/extraparameter.controller';

@Controller()
export class ExportController {
  private apiService = new ApiService();
  SERVICE = apiServiceName('case-data');
  TEMPLATING_SERVICE = apiServiceName('templating');

  @Post('/:municipalityId/export')
  @OpenAPI({ summary: 'Export list of errands' })
  @UseBefore(authMiddleware)
  async exportErrands(
    @Req() req: RequestWithUser,
    @Body() data: (Errand & { caseLabel: string })[],
    @Param('municipalityId') municipalityId: string,
    @QueryParam('include') include: string,
  ): Promise<any> {
    const renderRequest: RenderRequest = {
      identifier: 'sbk.errands.export',
      parameters: {
        errands: data.map(e => ({
          errandNumber: e.errandNumber,
          caseType: e.caseLabel,
          status: e.status.statusType,
          created: e.created,
        })),
      },
    };

    const url = `${this.TEMPLATING_SERVICE}/${MUNICIPALITY_ID}/render/pdf`;
    const response = await this.apiService.post<RenderResponse, RenderRequest>({ url, data: renderRequest }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Export PDF rendered` };
  }

  @Post('/:municipalityId/exportsingle')
  @OpenAPI({ summary: 'Export single errand' })
  @UseBefore(authMiddleware)
  async exportSingleErrand(
    @Req() req: RequestWithUser,
    @Body() data: Errand & { administratorName: string; caseLabel: string; attachments: any[] },
    @Param('municipalityId') municipalityId: string,
    @QueryParam('include') include: string,
  ): Promise<any> {
    const templateStakeholder = (
      s: Stakeholder & { street: string; zip: string; city: string; phoneNumbers: { value: string }[]; emails: { value: string }[] },
    ) => {
      return {
        name: s.firstName + ' ' + s.lastName,
        street: s.street,
        zip: s.zip,
        city: s.city,
        email: s.emails?.map(v => v.value).join(', ') ?? 'E-post saknas',
        phone: s.phoneNumbers?.map(v => v.value).join(', ') ?? 'Telefonnummer saknas',
      };
    };

    let basicInformation = undefined;
    if (include?.includes('basicInformation')) {
      basicInformation = {
        administratorName: data.administratorName,
        caseLabel: data.caseLabel,
        status: data.status,
        phase: data.phase,
        channel: data.channel,
        priority: data.priority,
        description: data.description,
        facilities: data.facilities.map(f => f?.address?.propertyDesignation ?? 'Fastighetsbeteckning saknas') ?? [],
        applicants: data.stakeholders.filter(s => s.roles.includes('APPLICANT'))?.map(templateStakeholder),
        contacts: data.stakeholders.filter(s => !s.roles.includes('APPLICANT') && !s.roles.includes('ADMINISTRATOR'))?.map(templateStakeholder),
        created: dayjs(data.created).format('YYYY-MM-DD HH:mm:ss'),
        updated: dayjs(data.updated).format('YYYY-MM-DD HH:mm:ss'),
      };
    }

    let messages = [];
    if (include?.includes('messages')) {
      const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${data.id}/messages`;
      const baseURL = apiURL(this.SERVICE);
      const res = await this.apiService.get<IMessageResponse[]>({ url, baseURL }, req.user).catch(e => {
        logger.error('Error when fetching messages for errand: ', data.id);
        throw e;
      });
      messages = res.data;
    }

    let notes = [];
    if (include?.includes('notes')) {
      notes = data.notes
        .filter(n => n.noteType !== 'INTERNAL')
        .map(n => ({
          ...n,
          created: dayjs(n.created).format('YYYY-MM-DD HH:MM:ss'),
        }));
    }

    let extraParameters = [];
    if (include?.includes('errandInformation')) {
      extraParameters = data.extraParameters.filter(p => !PROCESS_PARAMETER_KEYS.includes(p.key));
    }

    let decisions = [];
    if (include?.includes('investigationText')) {
      decisions = data.decisions
        .filter(d => d.decisionType === 'PROPOSED')
        .map(d => ({
          ...d,
          attachments: [],
        }));
    }

    const renderRequest: RenderRequest = {
      identifier: 'sbk.singleerrand.export',
      parameters: {
        errand: {
          errandNumber: data.errandNumber,
          ...(basicInformation && { basicInformation }),
          messages,
          notes,
          decisions,
          extraParameters,
        },
      },
    };

    const url = `${this.TEMPLATING_SERVICE}/${MUNICIPALITY_ID}/render/pdf`;
    const response = await this.apiService.post<RenderResponse, RenderRequest>({ url, data: renderRequest }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Export PDF rendered` };
  }
}
