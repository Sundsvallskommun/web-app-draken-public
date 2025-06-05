import { MUNICIPALITY_ID } from '@/config';
import { Errand, MessageResponse as IMessageResponse } from '@/data-contracts/case-data/data-contracts';
import { RenderRequest, RenderResponse } from '@/data-contracts/templating/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { logger } from '@/utils/logger';
import { apiURL } from '@/utils/util';
import dayjs from 'dayjs';
import { Body, Controller, Param, Post, QueryParam, Req, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

@Controller()
export class ExportController {
  private apiService = new ApiService();
  SERVICE = `case-data/11.0`;

  @Post('/:municipalityId/export')
  @OpenAPI({ summary: 'Export list of errands' })
  @UseBefore(authMiddleware)
  async exportErrands(
    @Req() req: RequestWithUser,
    @Body() data: (Errand & { caseLabel: string })[],
    @Param('municipalityId') municipalityId: string,
    @QueryParam('exclude') exclude: string,
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

    const url = `templating/2.0/${MUNICIPALITY_ID}/render/pdf`;
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
    @QueryParam('exclude') exclude: string,
  ): Promise<any> {
    let basicInformation = {};
    if (!exclude?.includes('basicInformation')) {
      basicInformation = {
        administratorName: data.administratorName,
        errandNumber: data.errandNumber,
        caseLabel: data.caseLabel,
        status: data.status,
        phase: data.phase,
        channel: data.channel,
        priority: data.priority,
        description: data.description,
        created: dayjs(data.created).format('YYYY-MM-DD HH:mm:ss'),
        updated: dayjs(data.updated).format('YYYY-MM-DD HH:mm:ss'),
      };
    }

    let messages = [];
    if (!exclude?.includes('messages')) {
      const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${data.id}/messages`;
      const baseURL = apiURL(this.SERVICE);
      const res = await this.apiService.get<IMessageResponse[]>({ url, baseURL }, req.user).catch(e => {
        logger.error('Error when fetching messages for errand: ', data.id);
        throw e;
      });
      messages = res.data;
    }

    let notes = [];
    if (!exclude?.includes('notes')) {
      notes = data.notes
        .filter(n => n.noteType !== 'INTERNAL')
        .map(n => ({
          ...n,
          created: dayjs(n.created).format('YYYY-MM-DD HH:MM:ss'),
        }));
    }

    let attachments = [];
    if (!exclude?.includes('attachment')) {
      attachments = data.attachments.map(a => ({
        ...a,
        created: dayjs(a.created).format('YYYY-MM-DD HH:MM:ss'),
      }));
    }

    let extraParameters = [];
    if (!exclude?.includes('extraParameters')) {
      extraParameters = data.extraParameters.filter(p => !p.key.includes('process'));
    }

    let decisions = [];
    if (!exclude?.includes('decisions')) {
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
          ...basicInformation,
          messages,
          notes,
          attachments,
          decisions,
          extraParameters,
        },
      },
    };

    const url = `templating/2.0/${MUNICIPALITY_ID}/render/pdf`;
    const response = await this.apiService.post<RenderResponse, RenderRequest>({ url, data: renderRequest }, req.user).catch(e => {
      throw e;
    });
    return { data: response.data, message: `Export PDF rendered` };
  }
}
