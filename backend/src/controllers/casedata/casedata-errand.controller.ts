import { CaseTypes } from '@/interfaces/case-type.interface';
import { isPT, isMEX } from '@/services/application.service';
import { RequestWithUser } from '@interfaces/auth.interface';
import { ErrandStatus, StatusDTO } from '@interfaces/errand-status.interface';
import { CreateErrandDto, CPatchErrandDto } from '@interfaces/errand.interface';
import { Role } from '@interfaces/role';
import { CreateStakeholderDto } from '@interfaces/stakeholder.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { hasPermissions } from '@middlewares/permissions.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import { makeErrandApiData } from '@services/errand.service';
import { logger } from '@utils/logger';
import dayjs from 'dayjs';
import { Body, Controller, Get, HttpCode, Param, Patch, Post, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { apiURL, luhnCheck, withRetries } from '../../utils/util';
import { ErrandPhase } from '@interfaces/errand-phase.interface';
import {
  Errand as ErrandDTO,
  PageErrand as PageErrandDTO,
  PatchErrand as PatchErrandDTO,
  Stakeholder as StakeholderDTO,
} from '@/data-contracts/case-data/data-contracts';
import { MUNICIPALITY_ID } from '@/config';

interface SingleErrandResponseData {
  data: ErrandDTO;
  message: string;
}

interface ResponseData {
  data: PageErrandDTO;
  message: string;
}

@Controller()
@UseBefore(hasPermissions(['canEditCasedata']))
export class CaseDataErrandController {
  private apiService = new ApiService();
  SERVICE = `case-data/11.0`;

  preparedErrandResponse = async (errandData: ErrandDTO, req: any) => {
    const applicant: StakeholderDTO & { personalNumber?: string } = errandData.stakeholders.find(s => s.roles.includes(Role.APPLICANT));
    if (applicant && applicant.personId) {
      const personNumberUrl = `citizen/3.0/${MUNICIPALITY_ID}/${applicant.personId}/personnumber`;
      const personNumberRes = await this.apiService
        .get<string>({ url: personNumberUrl }, req.user)
        .then(res => ({ data: `${res.data}` }))
        .catch(e => ({ data: undefined, message: '404' }));
      applicant.personalNumber = personNumberRes.data;
    }
    const fellowApplicants: (StakeholderDTO & { personalNumber?: string })[] =
      errandData.stakeholders?.filter(s => s.roles.includes(Role.FELLOW_APPLICANT) || s.roles.includes(Role.CONTACT_PERSON)) || [];
    const fellowApplicantsPromises = fellowApplicants.map(fa => {
      if (fa && fa.personId) {
        const personNumberUrl = `citizen/3.0/${MUNICIPALITY_ID}/${fa.personId}/personnumber`;
        const getPersonalNumber = () =>
          this.apiService
            .get<string>({ url: personNumberUrl }, req.user)
            .then(res => {
              fa.personalNumber = res.data;
              return res;
            })
            .catch(e => ({ data: undefined, message: '404' }));
        return withRetries(3, getPersonalNumber);
      } else {
        return Promise.resolve(true);
      }
    });
    await Promise.all(fellowApplicantsPromises);
    const resToSend: SingleErrandResponseData = { data: errandData, message: 'success' };
    return resToSend;
  };

  @Get('/casedata/:municipalityId/errand/:id')
  @OpenAPI({ summary: 'Return an errand by id' })
  @UseBefore(authMiddleware)
  async errand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<SingleErrandResponseData> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const errandResponse = await this.apiService.get<ErrandDTO>({ url, baseURL }, req.user);
    const errandData = errandResponse.data;
    return response.send(await this.preparedErrandResponse(errandData, req));
  }

  @Get('/casedata/:municipalityId/errand/errandnumber/:errandNumber')
  @OpenAPI({ summary: 'Return an errand by errand number' })
  @UseBefore(authMiddleware)
  async errandByErrandNumber(
    @Req() req: RequestWithUser,
    @Param('errandNumber') errandNumber: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<SingleErrandResponseData> {
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands?filter=errandNumber:'${errandNumber}'`;
    const baseURL = apiURL(this.SERVICE);
    const errandResponse = await this.apiService.get<PageErrandDTO>({ url, baseURL }, req.user);
    const errandData = errandResponse.data.content[0];
    return response.send(await this.preparedErrandResponse(errandData, req));
  }

  @Get('/casedata/:municipalityId/errands')
  @OpenAPI({ summary: 'Return a list of errands for current logged in user' })
  @UseBefore(authMiddleware, hasPermissions(['canEditCasedata'])) //hasRoles(['sg_mea_prh_utvecklare']))
  async getErrands(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @QueryParam('page') page: number,
    @QueryParam('size') size: number,
    @QueryParam('priority') priority: string,
    @QueryParam('phase') phase: string,
    @QueryParam('query') query: string,
    @QueryParam('caseType') caseType: string,
    @QueryParam('status') status: string,
    @QueryParam('ongoing') ongoing: string,
    @QueryParam('stakeholders') stakeholders: string,
    @QueryParam('errandNumber') errandNumber: string,
    @QueryParam('start') start: string,
    @QueryParam('end') end: string,
    @QueryParam('sort') sort: string,
    @QueryParam('propertyDesignation') propertyDesignation: string, //Added
    @Res() response: any,
  ): Promise<ResponseData> {
    let url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands?page=${page || 0}&size=${size || 8}`;
    const baseURL = apiURL(this.SERVICE);
    const filterList = [];
    if (query) {
      let guidRes = null;
      const isPersonNumber = luhnCheck(query);
      if (isPersonNumber) {
        const guidUrl = `citizen/3.0/${MUNICIPALITY_ID}/${query}/guid`;
        guidRes = await this.apiService.get<string>({ url: guidUrl }, req.user).catch(e => null);
      }
      let queryFilter = `(`;
      queryFilter += `exists(stakeholders.firstName~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.lastName~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.addresses.street~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.addresses.postalCode~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.addresses.city~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.contactInformation.value~'*${query.replace('+', '')}*')`;
      queryFilter += ` or exists(stakeholders.organizationNumber~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.organizationName~'*${query}*')`;
      if (guidRes !== null) {
        queryFilter += ` or exists(stakeholders.personId ~ '*${guidRes.data}*')`;
      }
      queryFilter += ` or errandNumber~'*${query}*'`;
      queryFilter += ` or exists(facilities.address.propertyDesignation~'*${query}*')`;
      queryFilter += ')';
      filterList.push(queryFilter);
    }
    if (ongoing) {
      filterList.push(`not(status.statusType:'Beslutad' or status.statusType:'Beslut verkställt' or status.statusType:'Ärendet avvisas')`);
    }
    if (priority) {
      const priorityQuery = [];
      priority.split(',').forEach(s => {
        priorityQuery.push(`priority:'${s}'`);
      });
      filterList.push(`(${priorityQuery.join(' or ')})`);
    }
    if (phase) {
      const phaseQuery = [];
      phase.split(',').forEach(s => {
        const label = ErrandPhase[s];
        phaseQuery.push(`phase:'${label}'`);
      });
      filterList.push(`(${phaseQuery.join(' or ')})`);
    }
    if (status) {
      const statusQuery = [];
      status.split(',').forEach(s => {
        const label = ErrandStatus[s];
        statusQuery.push(`status.statusType:'${label}'`);
      });
      filterList.push(`(${statusQuery.join(' or ')})`);
    }
    if (caseType) {
      const ss = caseType.split(',').map(s => `caseType:'${s}'`);
      filterList.push(`(${ss.join(' or ')})`);
    } else {
      let applicationCaseTypes;
      if (isPT()) {
        applicationCaseTypes = Object.values(CaseTypes.PT);
      } else if (isMEX()) {
        applicationCaseTypes = Object.values(CaseTypes.MEX);
      } else {
        applicationCaseTypes = [];
      }
      const ss = applicationCaseTypes.map(s => `'${s}'`);
      filterList.push(`(caseType in [${ss.join(',')}])`);
    }
    if (sort) {
      url += `&sort=${sort}`;
    }
    if (stakeholders) {
      // If both query and stakeholder filter is applied, the stakeholder parts will collide
      // and give zero hits since query filters are applied to the stakeholder key as well.
      // Therefore, an exists() clause must be used to have the filters apply to the stakeholder
      // objects separately.
      if (query) {
        filterList.push(`exists(stakeholders.adAccount:'${stakeholders}')`);
      } else {
        filterList.push(`stakeholders.adAccount:'${stakeholders}'`);
      }
    }
    if (errandNumber) {
      filterList.push(`errandNumber:'${errandNumber}'`);
    }
    if (start) {
      const s = dayjs(start).startOf('day').toISOString();
      filterList.push(`created>'${s}'`);
    }
    if (end) {
      const e = dayjs(end).endOf('day').toISOString();
      filterList.push(`created<'${e}'`);
    }

    if (propertyDesignation) {
      filterList.push(`facilities.address.propertyDesignation~'*${propertyDesignation}*'`);
    }

    let filter = filterList.length > 0 ? `&filter=${filterList.join(' and ')}` : '';
    filter = encodeURI(filter);
    url += filter;

    const res = await this.apiService.get<PageErrandDTO>({ url, baseURL }, req.user);
    const resToSend: ResponseData = { data: res.data, message: 'success' };
    return response.send(resToSend);
  }

  @Post('/casedata/:municipalityId/errands')
  @HttpCode(201)
  @OpenAPI({ summary: 'Create a new errand' })
  @UseBefore(authMiddleware, validationMiddleware(CreateErrandDto, 'body'))
  async newErrand(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() errandData: CreateErrandDto,
  ): Promise<{ data: ErrandDTO; message: string }> {
    const { user } = req;
    const data = makeErrandApiData(errandData, undefined);

    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands`;
    const baseURL = apiURL(this.SERVICE);
    const response = await this.apiService
      .post<ErrandDTO, Partial<ErrandDTO>>({ url, baseURL, data: data }, req.user)
      .then(errandResponse => {
        return errandResponse.data;
      })
      .catch(e => {
        logger.error('Error when creating errand');
        logger.error(e);
        throw e;
      });
    return { data: response, message: 'Errand created' };
  }

  @Patch('/casedata/:municipalityId/errands/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Modify an existing errand' })
  @UseBefore(authMiddleware, hasPermissions(['canEditCasedata']), validationMiddleware(CPatchErrandDto, 'body'))
  async editErrand(
    @Req() req: RequestWithUser,
    @Param('id') errandId: number,
    @Param('municipalityId') municipalityId: string,
    @Body() errandData: PatchErrandDTO,
  ): Promise<{ data: ErrandDTO; message: string }> {
    const { user } = req;
    if (!errandId) {
      throw 'Id not found. Cannot patch errand without id.';
    }

    const administratorCheckedData = errandData;

    const data = makeErrandApiData(administratorCheckedData, errandId.toString());
    const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${data.id}`;
    const baseURL = apiURL(this.SERVICE);
    const strippedStakeholders = { ...data, stakeholders: [] };
    const patchResponse = await this.apiService
      .patch<ErrandDTO, Partial<PatchErrandDTO>>({ url, baseURL, data: strippedStakeholders }, req.user)
      .then(errandPatchResponse => {
        const stakeholderPatchPromises =
          data.stakeholders
            ?.filter(s => !s.id)
            .map(async (stakeholder, idx) => {
              const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${data.id}/stakeholders`;
              const baseURL = apiURL(this.SERVICE);
              const patchStakeholder = () =>
                this.apiService.patch<any, StakeholderDTO>({ url, baseURL, data: stakeholder }, req.user).catch(e => {
                  logger.error('Something went wrong when patching stakeholder');
                  logger.error(e);
                  throw e;
                });
              return withRetries(0, patchStakeholder);
            }) || [];

        const stakeholderPutPromises =
          data.stakeholders
            ?.filter(s => s.id)
            .map(async (stakeholder, idx) => {
              const data = stakeholder;
              const url = `${municipalityId}/${process.env.CASEDATA_NAMESPACE}/errands/${data.id}/stakeholders/${stakeholder.id}`;
              const baseURL = apiURL(this.SERVICE);
              const putStakeholder = () =>
                this.apiService.put<any, StakeholderDTO>({ url, baseURL, data }, req.user).catch(e => {
                  logger.error('Something went wrong when putting stakeholder');
                  logger.error(e);
                  throw e;
                });
              return withRetries(0, putStakeholder);
            }) || [];
        return Promise.all([...stakeholderPatchPromises, ...stakeholderPutPromises]).then(res => errandPatchResponse);
      })
      .catch(e => {
        logger.error('Something went wrong when patching errand');
        logger.error(e);
        throw e;
      });
    return patchResponse;
  }
}
