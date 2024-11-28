import { CASEDATA_NAMESPACE, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import {
  Errand as CasedataErrandDTO,
  ErrandChannelEnum as CasedataErrandDtoChannelEnum,
  ErrandPriorityEnum as CasedataErrandDtoPriorityEnum,
  Facility as FacilityDTO,
  Stakeholder as CasedataStakeholderDTO,
  StakeholderTypeEnum as CasedataStakeholderDtoTypeEnum,
  AddressAddressCategoryEnum,
  ContactInformationContactTypeEnum,
} from '@/data-contracts/case-data/data-contracts';
import {
  Errand as SupportErrand,
  ErrandAttachmentHeader,
  Priority as SupportPriority,
  Stakeholder as SupportStakeholder,
  PageErrand,
} from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { CreateAttachmentDto } from '@/interfaces/attachment.interface';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { MEXCaseType } from '@/interfaces/case-type.interface';
import { ErrandStatus } from '@/interfaces/errand-status.interface';
// import { Errand as CaseDataErrand, ErrandApiData } from '@/interfaces/errand.interface';
import { ExternalIdType } from '@/interfaces/externalIdType.interface';
import { Role } from '@/interfaces/role';
import { ContactChannelType } from '@/interfaces/support-contactchannel';
import { SupportManagementChannels } from '@/interfaces/supportmanagement-channel.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { checkIfSupportAdministrator } from '@/services/support-errand.service';
import { logger } from '@/utils/logger';
import { apiURL, luhnCheck, toOffsetDateTime, withRetries } from '@/utils/util';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import dayjs from 'dayjs';
import { Body, Controller, Get, HttpCode, Param, Patch, Post, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';

export enum CustomerType {
  PRIVATE,
  ENTERPRISE,
  EMPLOYEE,
}

export enum Status {
  NEW = 'NEW',
  ONGOING = 'ONGOING',
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  SOLVED = 'SOLVED',
}

export enum StatusLabel {
  NEW = 'Inkommet',
  ONGOING = 'Pågående',
  PENDING = 'Komplettering',
  ASSIGNED = 'Tilldelat',
  SOLVED = 'Avslutat',
}

export enum Resolution {
  INFORMED = 'INFORMED',
  ESCALATED = 'ESCALATED',
  CONNECTED = 'CONNNECTED',
}

export enum ResolutionLabel {
  INFORMED = 'Informerat',
  ESCALATED = 'Eskalerat',
  CONNECTED = 'Kopplat',
}

export interface SupportErrandParameters {
  name: string;
  value: string;
}

export type ExternalTags = Array<{ key: string; value: string }>;

export class SupportErrandDto implements SupportErrand {
  @IsString()
  @IsOptional()
  assignedUserId: string;
  @IsString()
  @IsOptional()
  reporterUserId: string;
  @IsOptional()
  @IsObject()
  classification: {
    category: string;
    type: string;
  };
  @IsOptional()
  @IsArray()
  labels: string[];
  @IsOptional()
  @IsString()
  contactReason: string;
  @IsOptional()
  @IsString()
  contactReasonDescription: string;
  @IsOptional()
  @IsBoolean()
  businessRelated: boolean;
  @IsOptional()
  @IsString()
  channel: string;
  @IsOptional()
  @IsObject()
  customer: {
    description: string;
    id: string;
    type: CustomerType;
  };
  @IsOptional()
  @IsString()
  priority: SupportPriority;
  @IsOptional()
  @IsString()
  status: string;
  @IsOptional()
  @IsObject()
  suspension: {
    suspendedFrom: string;
    suspendedTo: string;
  };
  @IsOptional()
  @IsString()
  resolution: string;
  @IsOptional()
  @IsString()
  escalationEmail?: string;
  @IsOptional()
  @IsString()
  title: string;
  @IsOptional()
  @IsString()
  description: string;
  @IsArray()
  @IsOptional()
  stakeholders: SupportStakeholder[];
  @IsArray()
  @IsOptional()
  externalTags: ExternalTags;
  parameters: {
    key: string;
    displayName: string;
    values: string[];
  }[];
}

class ForwardFormDto {
  @IsString()
  recipient: string;
  @IsString()
  email: string;
  @IsString()
  department: 'MEX';
  @IsString()
  message: string;
  @IsString()
  messageBodyPlaintext: string;
}

export enum SupportStakeholderRole {
  PRIMARY = 'PRIMARY',
  CONTACT = 'CONTACT',
}

@Controller()
@UseBefore(hasPermissions(['canEditSupportManagement']))
export class SupportErrandController {
  private apiService = new ApiService();
  private namespace = SUPPORTMANAGEMENT_NAMESPACE;
  SERVICE = `supportmanagement/9.0`;

  preparedErrandResponse = async (errandData: SupportErrand, req: any) => {
    const customer: SupportStakeholder & { personNumber?: string } = errandData.stakeholders.find(s => s.role === SupportStakeholderRole.PRIMARY);
    if (
      customer &&
      customer.externalId &&
      (customer.externalIdType === ExternalIdType.PRIVATE || customer.externalIdType === ExternalIdType.EMPLOYEE)
    ) {
      const personNumberUrl = `citizen/2.0/${customer.externalId}/personnumber`;
      const personNumberRes = await this.apiService
        .get<string>({ url: personNumberUrl }, req.user)
        .then(res => ({ data: `${res.data}` }))
        .catch(e => ({ data: undefined, message: '404' }));
      customer.personNumber = personNumberRes.data;
    }
    const contacts: (SupportStakeholder & { personNumber?: string })[] =
      errandData.stakeholders.filter(s => s.role !== SupportStakeholderRole.PRIMARY) || [];
    const contactsPromises = contacts.map(contact => {
      if (
        contact &&
        contact.externalId &&
        (contact.externalIdType === ExternalIdType.PRIVATE || contact.externalIdType === ExternalIdType.EMPLOYEE)
      ) {
        const personNumberUrl = `citizen/2.0/${contact.externalId}/personnumber`;
        const getPersonalNumber = () =>
          this.apiService
            .get<string>({ url: personNumberUrl }, req.user)
            .then(res => {
              contact.personNumber = res.data;
              return res;
            })
            .catch(e => ({ data: undefined, message: '404' }));
        return withRetries(3, getPersonalNumber);
      } else {
        return Promise.resolve(true);
      }
    });
    await Promise.all(contactsPromises);
    const resToSend = { data: errandData, message: 'success' };
    return resToSend;
  };

  @Get('/supporterrands/:municipalityId/:id')
  @OpenAPI({ summary: 'Return an errand by id' })
  @UseBefore(authMiddleware)
  async errand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<SupportErrand> {
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch errands.');
      logger.error('No municipality id found, needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/${id}`;
    const errandResponse = await this.apiService.get<SupportErrand>({ url }, req.user);
    const errandData = errandResponse.data;

    return response.send((await this.preparedErrandResponse(errandData, req)).data);
  }

  @Get('/supporterrands/:municipalityId')
  @OpenAPI({ summary: 'Return all support errands for municipality' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']))
  async errands(
    @Req() req: RequestWithUser,
    @QueryParam('page') page: number,
    @QueryParam('size') size: number,
    @QueryParam('query') query: string,
    @QueryParam('stakeholders') stakeholders: string,
    @QueryParam('priority') priority: string,
    @QueryParam('category') category: string,
    @QueryParam('type') type: string,
    @QueryParam('labelCategory') labelCategory: string,
    @QueryParam('labelType') labelType: string,
    @QueryParam('labelSubType') labelSubType: string,
    @QueryParam('channel') channel: string,
    @QueryParam('ongoing') ongoing: string,
    @QueryParam('status') status: string,
    @QueryParam('resolution') resolution: string,
    @QueryParam('start') start: string,
    @QueryParam('end') end: string,
    @QueryParam('sort') sort: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<PageErrand> {
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch errands.');
      logger.error('No municipality id found, needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }
    const filterList = [];
    if (query) {
      let guidRes = null;
      const isPersonNumber = luhnCheck(query);
      if (isPersonNumber) {
        const guidUrl = `citizen/2.0/${query}/guid`;
        guidRes = await this.apiService.get<string>({ url: guidUrl }, req.user).catch(e => null);
      }
      let queryFilter = `(`;
      queryFilter += `description~'*${query}*'`;
      queryFilter += ` or title~'*${query}*'`;
      queryFilter += ` or errandNumber~'*${query}*'`;
      queryFilter += ` or exists(stakeholders.firstName~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.lastName~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.address~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.zipCode~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.contactChannels.value~'*${query}*' and stakeholders.contactChannels.type~'Email')`;
      queryFilter += ` or exists(stakeholders.contactChannels.value~'*${query.replace('+', '')}*' and stakeholders.contactChannels.type~'Phone')`;
      queryFilter += ` or exists(stakeholders.organizationName ~ '*${query}*')`;
      queryFilter += ` or exists(stakeholders.externalId ~ '*${query}*')`;
      queryFilter += ` or exists(parameters.values~'*${query}*')`;
      if (guidRes !== null) {
        queryFilter += ` or exists(stakeholders.externalId ~ '*${guidRes.data}*')`;
      }
      queryFilter += ')';
      filterList.push(queryFilter);
    }
    if (stakeholders) {
      filterList.push(`(assignedUserId:'${stakeholders}' or (assignedUserId is null and reporterUserId:'${stakeholders}' ))`);
    }
    if (priority) {
      filterList.push(`priority:'${priority}'`);
    }
    if (category) {
      const ss = category.split(',').map(s => `category:'${s}'`);
      filterList.push(`(${ss.join(' or ')})`);
    }
    if (type) {
      const ss = type.split(',').map(s => `type:'${s}'`);
      filterList.push(`(${ss.join(' or ')})`);
    }
    if (labelCategory || labelType || labelSubType) {
      const labelCategoryList = labelCategory?.split(',');
      const labelTypeList = labelType?.split(',');
      let labels = labelSubType ? labelSubType.split(',') : labelType ? labelType.split(',') : labelCategory.split(',');
      if (labelCategory) {
        labels = labels.filter(l => labelCategoryList.some(c => l.includes(c)));
      }
      if (labelType) {
        labels = labels.filter(l => labelTypeList.some(c => l.includes(c)));
      }
      const ss = labels
        .join(',')
        .split(',')
        .map(s => `labels:'${s}'`);
      filterList.push(`(${ss.join(' or ')})`);
    }
    if (channel) {
      filterList.push(`channel:'${channel}'`);
    }
    if (ongoing) {
      filterList.push(`not(status:'SOLVED')`);
    }
    if (status) {
      const ss = status.split(',').map(s => `status:'${s}'`);
      filterList.push(`(${ss.join(' or ')})`);
    }
    if (resolution) {
      filterList.push(`resolution:'${resolution}'`);
    }
    if (start) {
      const s = toOffsetDateTime(dayjs(start).startOf('day'));
      filterList.push(`created>'${s}'`);
    }
    if (end) {
      const e = toOffsetDateTime(dayjs(end).endOf('day'));
      filterList.push(`created<'${e}'`);
    }
    // Always filter out errands with category=NONE or type=NONE
    filterList.push(`not(category:'NONE')`);
    filterList.push(`not(type:'NONE')`);

    const filter = filterList.length > 0 ? `&filter=${filterList.join(' and ')}` : '';
    let url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands?page=${page || 0}&size=${size || 8}`;
    url += filter;
    if (sort) {
      url += `&sort=${sort}`;
    }
    const res = await this.apiService.get<PageErrand>({ url }, req.user);
    const data = res.data;
    return response.status(200).send(data);
  }

  @Post('/newerrand/:municipalityId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Initiate a new, empty support errand' })
  @UseBefore(authMiddleware, validationMiddleware(SupportErrandDto, 'body'))
  async initiateSupportErrand(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Body() data: Partial<SupportErrandDto>,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    const isAdmin = await checkIfSupportAdministrator(req.user);
    if (!isAdmin) {
      throw new HttpException(403, 'Forbidden');
    }
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch errands.');
      logger.error('No municipality id found, needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }
    const url = `${municipalityId}/${this.namespace}/errands`;
    const baseURL = apiURL(this.SERVICE);
    const body: SupportErrand = {
      reporterUserId: req.user.username,
      assignedUserId: req.user.username,
      classification: {
        category: 'NONE',
        type: 'NONE',
      },
      priority: 'MEDIUM' as SupportPriority,
      status: Status.NEW,
      resolution: Resolution.INFORMED,
      title: 'Empty errand',
      externalTags: [{ key: 'caseId', value: `${dayjs().format('YYYYMMDD')}-${Math.floor(Math.random() * 10000)}` }],
    };
    const res = await this.apiService.post<any, SupportErrand>({ url, baseURL, data: body }, req.user).catch(e => {
      logger.error('Error when initiating support errand');
      logger.error(e);
      throw e;
    });
    if (!res.data || res.data === '') {
      console.error('Something went wrong when initiating support errand');
      logger.error('Something went wrong when initiating support errand');
      return response.status(500).send('Something went wrong when initiating support errand');
    }
    return response.status(201).send(res.data);
  }

  @Patch('/supporterrands/:municipalityId/:id')
  @HttpCode(201)
  @OpenAPI({ summary: 'Update a support errand' })
  @UseBefore(authMiddleware, validationMiddleware(SupportErrandDto, 'body'))
  async registerSupportErrand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: Partial<SupportErrandDto>,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    if (!municipalityId) {
      console.error('No municipality id found, it is needed to fetch errands.');
      logger.error('No municipality id found, it is needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }
    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const body: Partial<SupportErrandDto> = {
      ...data,
      ...(data.assignedUserId && { assignedUserId: data.assignedUserId }),
    };
    const res = await this.apiService.patch<any, Partial<SupportErrandDto>>({ url, baseURL, data: body }, req.user).catch(e => {
      logger.error('Error when registering support errand');
      logger.error(e);
      throw e;
    });
    return response.status(200).send(res.data);
  }

  @Patch('/supporterrands/:municipalityId/:id/admin')
  @HttpCode(201)
  @OpenAPI({ summary: 'Set user as admin for support errand' })
  @UseBefore(authMiddleware, validationMiddleware(SupportErrandDto, 'body'))
  async becomeAdminForSupportErrand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: Partial<SupportErrandDto>,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    const isAdmin = await checkIfSupportAdministrator(req.user);
    if (!isAdmin) {
      throw new HttpException(403, 'Forbidden');
    }
    if (!municipalityId) {
      console.error('No municipality id found, it is needed to update errand.');
      logger.error('No municipality id found, it is needed to update errand.');
      return response.status(400).send('Municipality id missing');
    }
    const url = `${municipalityId}/${this.namespace}/errands/${id}`;
    const baseURL = apiURL(this.SERVICE);
    const body: Partial<SupportErrandDto> = {
      assignedUserId: data.assignedUserId,
      status: data?.status,
    };
    const res = await this.apiService.patch<any, Partial<SupportErrandDto>>({ url, baseURL, data: body }, req.user).catch(e => {
      logger.error('Error when setting administrator for support errand');
      logger.error(e);
      throw e;
    });
    return response.status(200).send(res.data);
  }

  @Post('/supporterrands/:municipalityId/:id/forward')
  @HttpCode(201)
  @OpenAPI({ summary: 'Forward a support errand' })
  @UseBefore(authMiddleware, validationMiddleware(ForwardFormDto, 'body'))
  async forwardSupportErrand(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Param('municipalityId') municipalityId: string,
    @Body() data: Partial<ForwardFormDto>,
    @Res() response: any,
  ): Promise<{ data: any; message: string }> {
    if (!municipalityId) {
      console.error('No municipality id found, it is needed to forward errand.');
      logger.error('No municipality id found, it is needed to forward errand.');
      return response.status(400).send('Municipality id missing');
    }
    if (!id) {
      console.error('No errand id found, it is needed to forward errand.');
      logger.error('No errand id found, it is needed to forward errand.');
      return response.status(400).send('Errand id missing');
    }
    const supportErrandUrl = `${municipalityId}/${this.namespace}/errands/${id}`;
    const supportBaseURL = apiURL(this.SERVICE);
    const existingSupportErrand = await this.apiService.get<SupportErrand>({ url: supportErrandUrl, baseURL: supportBaseURL }, req.user);
    if (!existingSupportErrand) {
      console.error('No errand found with id', id);
      logger.error('No errand found with id', id);
      return response.status(404).send('No errand found with id');
    }

    const stakeholders: CasedataStakeholderDTO[] = [];
    existingSupportErrand.data.stakeholders.forEach((s: SupportStakeholder) => {
      if (!s.firstName) {
        console.error('Missing required fields for stakeholder');
        logger.error('Missing required fields for stakeholder');
        return response.status(400).send('Missing required fields for stakeholder');
      }
      // TODO Check for email and phone?
      // if (
      //   s.contactChannels.length === 0 ||
      //   !s.contactChannels.some(c => c.type === ContactChannelType.PHONE) ||
      //   !s.contactChannels.some(c => c.type === ContactChannelType.EMAIL)
      // ) {
      //   console.error('Missing required contact channels for stakeholder');
      //   logger.error('Missing required contact channels for stakeholder');
      //   return response.status(400).send('Missing required contact channels for stakeholder');
      // }
      if (s.externalIdType === ExternalIdType.COMPANY) {
        stakeholders.push({
          type: CasedataStakeholderDtoTypeEnum.ORGANIZATION,
          roles: [s.role === 'PRIMARY' ? Role.APPLICANT : Role.CONTACT_PERSON],
          addresses: s.address
            ? [
                {
                  addressCategory: AddressAddressCategoryEnum.POSTAL_ADDRESS,
                  street: s.address,
                  postalCode: s.zipCode || '',
                  city: s.city || '',
                  careOf: s.careOf || '',
                },
              ]
            : [],
          contactInformation:
            s.contactChannels?.length > 0
              ? s.contactChannels.map(c =>
                  c.type === ContactChannelType.PHONE
                    ? {
                        contactType: ContactInformationContactTypeEnum.PHONE,
                        value: c.value,
                      }
                    : c.type === ContactChannelType.EMAIL
                    ? {
                        contactType: ContactInformationContactTypeEnum.EMAIL,
                        value: c.value,
                      }
                    : null,
                )
              : [],
          firstName: '',
          lastName: '',
          organizationName: s.firstName,
          organizationNumber: s.externalId,
        });
      } else {
        stakeholders.push({
          type: CasedataStakeholderDtoTypeEnum.PERSON,
          roles: [s.role === 'PRIMARY' ? Role.APPLICANT : Role.CONTACT_PERSON],
          addresses: s.address
            ? [
                {
                  addressCategory: AddressAddressCategoryEnum.POSTAL_ADDRESS,
                  street: s.address,
                  postalCode: s.zipCode || '',
                  city: s.city || '',
                  careOf: s.careOf || '',
                },
              ]
            : [],
          contactInformation:
            s.contactChannels?.length > 0
              ? s.contactChannels.map(c =>
                  c.type === ContactChannelType.PHONE
                    ? {
                        contactType: ContactInformationContactTypeEnum.PHONE,
                        value: c.value,
                      }
                    : c.type === ContactChannelType.EMAIL
                    ? {
                        contactType: ContactInformationContactTypeEnum.EMAIL,
                        value: c.value,
                      }
                    : null,
                )
              : [],
          firstName: s.firstName,
          lastName: s.lastName ? s.lastName : '',
          ...(s.externalId && { personId: s.externalId ? s.externalId : '' }),
        });
      }
    });
    const supportChannel: SupportManagementChannels =
      SupportManagementChannels[existingSupportErrand.data.channel as keyof typeof SupportManagementChannels];
    let casedataChannel: CasedataErrandDtoChannelEnum;
    switch (supportChannel) {
      case SupportManagementChannels.CHAT:
        // TODO Missing matching channel in CaseData
        casedataChannel = CasedataErrandDtoChannelEnum.WEB_UI;
        break;
      case SupportManagementChannels.EMAIL:
        casedataChannel = CasedataErrandDtoChannelEnum.EMAIL;
        break;
      case SupportManagementChannels.IN_PERSON:
        // TODO Missing matching channel in CaseData
        casedataChannel = CasedataErrandDtoChannelEnum.WEB_UI;
        break;
      case SupportManagementChannels.SOCIAL_MEDIA:
        // TODO Missing matching channel in CaseData
        casedataChannel = CasedataErrandDtoChannelEnum.WEB_UI;
        break;
      case SupportManagementChannels.PHONE:
        // TODO Missing matching channel in CaseData
        casedataChannel = CasedataErrandDtoChannelEnum.MOBILE;
        break;
      case SupportManagementChannels.WEB_UI:
        casedataChannel = CasedataErrandDtoChannelEnum.WEB_UI;
        break;
      case SupportManagementChannels.ESERVICE:
        casedataChannel = CasedataErrandDtoChannelEnum.ESERVICE;
        break;
      default:
        casedataChannel = CasedataErrandDtoChannelEnum.EMAIL;
    }
    const facilities = [] as FacilityDTO[];
    const estates = existingSupportErrand.data.parameters.filter(obj => obj.key === 'propertyDesignation')[0]?.values;

    estates?.forEach(facility => {
      facilities.push({
        address: {
          propertyDesignation: facility,
        },
      });
    });

    const caseDataErrand: Partial<CasedataErrandDTO> = {
      caseType: MEXCaseType.MEX_FORWARDED_FROM_CONTACTSUNDSVALL as any,
      priority: existingSupportErrand.data.priority as unknown as CasedataErrandDtoPriorityEnum,
      channel: casedataChannel,
      description: existingSupportErrand.data.description,
      stakeholders: stakeholders,
      // TODO How to map facilities? How are property designations stored in SupportManagement?
      facilities: facilities,
      statuses: [
        {
          statusType: ErrandStatus.ArendeInkommit,
          description: ErrandStatus.ArendeInkommit,
          dateTime: new Date().toISOString(),
        },
      ],
      extraParameters: [{ key: 'supportManagementErrandNumber', values: [existingSupportErrand.data.errandNumber] }],
    };
    logger.info('Creating new errand in CaseData', caseDataErrand);
    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands`;
    const CASEDATA_SERVICE = `case-data/9.0`;
    const baseURL = apiURL(CASEDATA_SERVICE);
    const errand: CasedataErrandDTO = await this.apiService
      .post<CasedataErrandDTO, Partial<CasedataErrandDTO>>({ url, baseURL, data: caseDataErrand }, req.user)
      .then(errandResponse => {
        return errandResponse.data;
      })
      .catch(e => {
        logger.error('Error when creating errand');
        logger.error(e);
        throw e;
      });

    // Fetch support errand attachments
    try {
      const supportErrandAttachmentsUrl = `${municipalityId}/${this.namespace}/errands/${id}/attachments`;
      const existingSupportErrandAttachments = await this.apiService.get<ErrandAttachmentHeader[]>(
        { url: supportErrandAttachmentsUrl, baseURL: supportBaseURL },
        req.user,
      );
      const attachmentsPromises: Promise<ErrandAttachmentHeader & { fileData: ArrayBuffer }>[] = existingSupportErrandAttachments.data?.map(a => {
        const singleAttachmentsUrl = `${municipalityId}/${this.namespace}/errands/${id}/attachments/${a.id}`;
        const filesData = this.apiService
          .get<ArrayBuffer>({ url: singleAttachmentsUrl, baseURL: supportBaseURL, responseType: 'arraybuffer' }, req.user)
          .then(res => ({
            fileData: res.data,
            ...a,
          }));
        return filesData;
      });
      const attachments = await Promise.all(attachmentsPromises);
      const attachmentDtos: CreateAttachmentDto[] = attachments?.map(attachmentData => {
        const binaryString = Array.from(new Uint8Array(attachmentData.fileData), v => String.fromCharCode(v)).join('');
        const b64 = Buffer.from(binaryString, 'binary').toString('base64');
        const dto: CreateAttachmentDto = {
          file: b64,
          category: 'OTHER',
          extension: attachmentData.fileName.split('.').pop(),
          mimeType: attachmentData.mimeType,
          name: attachmentData.fileName,
          note: '',
          errandNumber: errand.errandNumber,
        };
        return dto;
      });

      const postedAttachments: Promise<CasedataErrandDTO>[] = attachmentDtos?.map(attachmentDto => {
        const casedataAttachmentsUrl = `${municipalityId}/${CASEDATA_NAMESPACE}/errands/${errand.id}/attachments`;
        const casedataAttachmentsResponse = this.apiService
          .post<CasedataErrandDTO, CreateAttachmentDto>({ url: casedataAttachmentsUrl, baseURL, data: attachmentDto }, req.user)
          .then(res => res.data)
          .catch(e => {
            logger.error('Error when posting attachments for forwarded errand:', e);
            throw e;
          });
        return casedataAttachmentsResponse;
      });
      await Promise.all(postedAttachments).catch(e => {
        console.error('Error when posting attachments for forwarded errand');
        logger.error('Error when posting attachments for forwarded errand');
        throw e;
      });
    } catch (error) {
      return response.status(400).send('ATTACHMENTS_FAILED');
    }

    return response.status(200).send(errand);
  }
}
