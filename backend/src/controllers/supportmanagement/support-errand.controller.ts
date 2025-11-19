import { CASEDATA_NAMESPACE, MUNICIPALITY_ID, SUPPORTMANAGEMENT_NAMESPACE } from '@/config';
import { apiServiceName } from '@/config/api-config';
import {
  AddressAddressCategoryEnum,
  Errand as CasedataErrandDTO,
  ErrandChannelEnum as CasedataErrandDtoChannelEnum,
  ErrandPriorityEnum as CasedataErrandDtoPriorityEnum,
  Stakeholder as CasedataStakeholderDTO,
  StakeholderTypeEnum as CasedataStakeholderDtoTypeEnum,
  ContactInformationContactTypeEnum,
  Facility as FacilityDTO,
} from '@/data-contracts/case-data/data-contracts';
import {
  ContactChannel,
  ErrandAttachment,
  ExternalTag,
  Label,
  Notification,
  PageErrand,
  Parameter,
  Errand as SupportErrand,
  Priority as SupportPriority,
  Stakeholder as SupportStakeholder,
  Suspension,
} from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { CreateAttachmentDto } from '@/interfaces/attachment.interface';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { MEXCaseType } from '@/interfaces/case-type.interface';
import { ErrandStatus } from '@/interfaces/errand-status.interface';
import { ExternalIdType } from '@/interfaces/externalIdType.interface';
import { Role } from '@/interfaces/role';
import { ContactChannelType } from '@/interfaces/support-contactchannel';
import { SupportManagementChannels } from '@/interfaces/supportmanagement-channel.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { hasPermissions } from '@/middlewares/permissions.middleware';
import { validationMiddleware } from '@/middlewares/validation.middleware';
import ApiService from '@/services/api.service';
import { isIK, isKA, isKC, isLOP, isMSVA, isROB } from '@/services/application.service';
import { checkIfSupportAdministrator } from '@/services/support-errand.service';
import { logger } from '@/utils/logger';
import { apiURL, luhnCheck, toOffsetDateTime, withRetries } from '@/utils/util';
import { Type as TypeTransformer } from 'class-transformer';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import dayjs from 'dayjs';
import { Body, Controller, Get, HttpCode, Param, Patch, Post, QueryParam, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { v4 as uuidv4, v4 } from 'uuid';

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
  ESCALATED = 'Överlämnat',
  CONNECTED = 'Kopplat',
}

export interface SupportErrandParameters {
  name: string;
  value: string;
}

export class CExternalTag implements ExternalTag {
  @IsString()
  key: string;
  @IsString()
  value: string;
}

export class CParameter implements Parameter {
  @IsString()
  key: string;
  @IsString()
  @IsOptional()
  displayName?: string;
  @IsString()
  @IsOptional()
  group?: string;
  @IsArray()
  @IsOptional()
  values: string[];
}

export class CContactChannel implements ContactChannel {
  @IsString()
  @IsOptional()
  type?: string;
  @IsString()
  @IsOptional()
  value?: string;
}

export class CSupportStakeholder implements SupportStakeholder {
  @IsString()
  @IsOptional()
  externalId?: string;
  @IsString()
  @IsOptional()
  externalIdType?: ExternalIdType;
  @IsString()
  @IsOptional()
  role?: string;
  @IsString()
  @IsOptional()
  city?: string;
  @IsString()
  @IsOptional()
  organizationName?: string;
  @IsString()
  @IsOptional()
  firstName?: string;
  @IsString()
  @IsOptional()
  lastName?: string;
  @IsString()
  @IsOptional()
  address?: string;
  @IsString()
  @IsOptional()
  careOf?: string;
  @IsString()
  @IsOptional()
  zipCode?: string;
  @IsString()
  @IsOptional()
  country?: string;
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CContactChannel)
  contactChannels: CContactChannel[];
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CParameter)
  parameters: Parameter[];
}

export class Classification {
  @IsString()
  category: string;
  @IsString()
  type: string;
}

export class CSuspension implements Suspension {
  @IsString()
  @IsOptional()
  suspendedFrom: string;
  @IsString()
  @IsOptional()
  suspendedTo: string;
}

export class CNotification implements Notification {
  @IsString()
  @IsOptional()
  id?: string;
  @IsString()
  @IsOptional()
  created?: string;
  @IsString()
  @IsOptional()
  modified?: string;
  @IsString()
  @IsOptional()
  ownerFullName?: string;
  @IsString()
  ownerId: string;
  @IsString()
  @IsOptional()
  createdBy?: string;
  @IsString()
  @IsOptional()
  createdByFullName?: string;
  @IsString()
  type: string;
  @IsString()
  description: string;
  @IsString()
  @IsOptional()
  content?: string;
  @IsString()
  @IsOptional()
  expires?: string;
  @IsBoolean()
  @IsOptional()
  globalAcknowledged?: boolean;
  @IsBoolean()
  @IsOptional()
  acknowledged?: boolean;
  @IsString()
  @IsOptional()
  errandId?: string;
  @IsString()
  @IsOptional()
  errandNumber?: string;
}
export class SupportErrandDto implements Partial<SupportErrand> {
  @IsString()
  @IsOptional()
  id?: string;
  @IsString()
  @IsOptional()
  errandNumber?: string;
  @IsString()
  @IsOptional()
  title?: string;
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CSupportStakeholder)
  stakeholders: CSupportStakeholder[];
  @IsString()
  @IsOptional()
  priority?: SupportPriority;
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CExternalTag)
  externalTags: ExternalTag[];
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CParameter)
  parameters: Parameter[];
  @TypeTransformer(() => Classification)
  @ValidateNested()
  @IsObject()
  @IsOptional()
  classification?: Classification;
  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsString()
  resolution?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsString()
  channel?: string;
  @IsString()
  @IsOptional()
  reporterUserId?: string;
  @IsString()
  @IsOptional()
  assignedUserId?: string;
  @IsString()
  @IsOptional()
  assignedGroupId?: string;
  @IsOptional()
  @IsString()
  escalationEmail?: string;
  @IsOptional()
  @IsString()
  contactReason?: string;
  @IsOptional()
  @IsString()
  contactReasonDescription?: string;
  @TypeTransformer(() => CSuspension)
  @ValidateNested()
  @IsObject()
  @IsOptional()
  suspension?: CSuspension;
  @IsOptional()
  @IsBoolean()
  businessRelated?: boolean;
  @IsOptional()
  @IsArray()
  labels?: Label[];
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CNotification)
  activeNotifications?: CNotification[];
  @IsOptional()
  @IsString()
  created?: string;
  @IsOptional()
  @IsString()
  modified?: string;
  @IsOptional()
  @IsString()
  touched?: string;
}

class ForwardFormDto {
  @IsString()
  recipient: string;
  @IsArray()
  emails: { value: string }[];
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
  SERVICE = apiServiceName('supportmanagement');
  CITIZEN_SERVICE = apiServiceName('citizen');

  // Accepted query parameters
  SAFE_CHARS_REGEX = /[^\p{L}\p{N}\s.\-_,:]/gu;

  sanitizeQuery = (s?: string): string => {
    return (s ?? '').normalize('NFKC').replace(this.SAFE_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
  };

  stripPhoneNoise = (s: string): string => s.replace(/\+/g, '');

  private async buildErrandFilter(
    req: RequestWithUser,
    queryRaw?: string,
    stakeholders?: string,
    priority?: string,
    category?: string,
    type?: string,
    labelCategory?: string,
    labelType?: string,
    labelSubType?: string,
    channel?: string,
    status?: string,
    resolution?: string,
    start?: string,
    end?: string,
  ): Promise<string> {
    const filterList: string[] = [];

    if (queryRaw) {
      const query = this.sanitizeQuery(queryRaw);
      const qPhone = this.stripPhoneNoise(query);

      let guidRes: { data?: string } | null = null;
      if (luhnCheck(queryRaw)) {
        const guidUrl = `${this.CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${queryRaw}/guid`;
        guidRes = await this.apiService.get<string>({ url: guidUrl }, req.user).catch(() => null);
      }

      let queryFilter = '(';
      queryFilter += `description~'*${query}*'`;
      queryFilter += ` or title~'*${query}*'`;
      queryFilter += ` or errandNumber~'*${query}*'`;
      queryFilter += ` or exists(stakeholders.firstName~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.lastName~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.address~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.zipCode~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.contactChannels.value~'*${query}*' and stakeholders.contactChannels.type~'${ContactChannelType.EMAIL}')`;
      queryFilter += ` or exists(stakeholders.contactChannels.value~'*${qPhone}*' and stakeholders.contactChannels.type~'${ContactChannelType.PHONE}')`;
      queryFilter += ` or exists(stakeholders.organizationName~'*${query}*')`;
      queryFilter += ` or exists(stakeholders.externalId~'*${query}*')`;
      queryFilter += ` or exists(parameters.values~'*${query}*')`;
      if (guidRes?.data) {
        const g = this.sanitizeQuery(guidRes.data);
        queryFilter += ` or exists(stakeholders.externalId~'*${g}*')`;
      }
      queryFilter += ')';
      filterList.push(queryFilter);
    }

    if (stakeholders) {
      filterList.push(`(assignedUserId:'${stakeholders}' or (assignedUserId is null and reporterUserId:'${stakeholders}' ))`);
    }
    if (priority) {
      const ss = priority.split(',').map(s => `priority:'${s}'`);
      filterList.push(`(${ss.join(' or ')})`);
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
      const labelSubTypeList = labelSubType?.split(',');
      if (labelCategoryList && labelCategoryList.length > 0) {
        const ss1 = labelCategoryList.map(s => `exists(labels.metadataLabel.resourcePath:'${s}')`);
        filterList.push(`(${ss1.join(' or ')})`);
      }
      if (labelTypeList && labelTypeList.length > 0) {
        const ss1 = labelTypeList.map(s => `exists(labels.metadataLabel.resourcePath:'${s}')`);
        filterList.push(`(${ss1.join(' or ')})`);
      }
      if (labelSubTypeList && labelSubTypeList.length > 0) {
        const ss1 = labelSubTypeList.map(s => `exists(labels.metadataLabel.resourcePath:'${s}')`);
        filterList.push(`(${ss1.join(' or ')})`);
      }
    }
    if (channel) {
      filterList.push(`channel:'${channel}'`);
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

    return filterList.length > 0 ? `&filter=${filterList.join(' and ')}` : '';
  }

  preparedErrandResponse = async (errandData: SupportErrand, req: any) => {
    const customer: SupportStakeholder & { personNumber?: string } = errandData.stakeholders.find(s => s.role === SupportStakeholderRole.PRIMARY);
    if (
      customer &&
      customer.externalId &&
      (customer.externalIdType === ExternalIdType.PRIVATE || customer.externalIdType === ExternalIdType.EMPLOYEE)
    ) {
      const personNumberUrl = `${this.CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${customer.externalId}/personnumber`;
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
        const personNumberUrl = `${this.CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${contact.externalId}/personnumber`;
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

    const filter = await this.buildErrandFilter(
      req,
      query,
      stakeholders,
      priority,
      category,
      type,
      labelCategory,
      labelType,
      labelSubType,
      channel,
      status,
      resolution,
      start,
      end,
    );
    let url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands?page=${page || 0}&size=${size || 8}`;
    url += filter;
    if (sort) {
      url += `&sort=${sort}`;
    }
    const res = await this.apiService.get<PageErrand>({ url }, req.user);
    const data = res.data;
    return response.status(200).send(data);
  }

  @Get('/countsupporterrands/:municipalityId')
  @OpenAPI({ summary: 'Counts errands based on the provided filters' })
  @UseBefore(authMiddleware, hasPermissions(['canEditSupportManagement']))
  async countErrands(
    @Req() req: RequestWithUser,
    @QueryParam('query') query: string,
    @QueryParam('stakeholders') stakeholders: string,
    @QueryParam('priority') priority: string,
    @QueryParam('category') category: string,
    @QueryParam('type') type: string,
    @QueryParam('labelCategory') labelCategory: string,
    @QueryParam('labelType') labelType: string,
    @QueryParam('labelSubType') labelSubType: string,
    @QueryParam('channel') channel: string,
    @QueryParam('status') status: string,
    @QueryParam('resolution') resolution: string,
    @QueryParam('start') start: string,
    @QueryParam('end') end: string,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<any> {
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch errands.');
      logger.error('No municipality id found, needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }

    const filter = await this.buildErrandFilter(
      req,
      query,
      stakeholders,
      priority,
      category,
      type,
      labelCategory,
      labelType,
      labelSubType,
      channel,
      status,
      resolution,
      start,
      end,
    );
    const url = `${this.SERVICE}/${municipalityId}/${this.namespace}/errands/count?${filter}`;
    const res = await this.apiService.get<PageErrand>({ url }, req.user);
    const data = res.data;
    return response.status(200).send(data);
  }

  @Post('/newerrand/:municipalityId')
  @HttpCode(201)
  @OpenAPI({ summary: 'Initiate a new, empty support errand' })
  @UseBefore(authMiddleware)
  async registerSupportErrand(
    @Req() req: RequestWithUser,
    @Param('municipalityId') municipalityId: string,
    @Res() response: any,
  ): Promise<{ data: SupportErrandDto; message: string }> {
    const isAdmin = await checkIfSupportAdministrator(req.user);
    if (!isAdmin) {
      throw new HttpException(403, 'Forbidden');
    }
    if (!municipalityId) {
      console.error('No municipality id found, needed to fetch errands.');
      logger.error('No municipality id found, needed to fetch errands.');
      return response.status(400).send('Municipality id missing');
    }

    // Fetch metadata for labels for new errand
    const metadataUrl = `${this.SERVICE}/${municipalityId}/${this.namespace}/metadata/labels`;
    const metadataRes = await this.apiService.get<{ labelStructure: Label[] }>({ url: metadataUrl }, req.user);
    const getDefaultLabels = (names: { category: string; type: string; subType?: string }) => {
      const categorybject = metadataRes.data.labelStructure?.find(l => l.resourcePath === names.category);
      if (!categorybject) return [];
      if (!names.type) return [categorybject];
      const typeObject = categorybject.labels?.find(l => l.resourcePath === names.type);
      if (!typeObject) return [categorybject];
      if (!names.subType) return [categorybject, typeObject];
      const subTypeObject = typeObject.labels?.find(l => l.resourcePath === names.subType);
      if (!subTypeObject) return [categorybject, typeObject];
      return [categorybject, typeObject, subTypeObject];
    };

    const url = `${municipalityId}/${this.namespace}/errands`;
    const baseURL = apiURL(this.SERVICE);
    const body: Partial<SupportErrandDto> = {
      reporterUserId: req.user.username,
      assignedUserId: req.user.username,
      classification: isKC()
        ? {
            category: 'CONTACT_SUNDSVALL',
            type: 'UNCATEGORIZED',
          }
        : isKA()
        ? {
            category: 'ADMINISTRATION',
            type: 'ADMINISTRATION/CONTACT_CENTER',
          }
        : isLOP()
        ? {
            category: 'SALARY',
            type: 'SALARY.UNCATEGORIZED',
          }
        : isIK()
        ? {
            category: 'KSK_SERVICE_CENTER',
            type: 'KSK_SERVICE_CENTER.UNCATEGORIZED',
          }
        : isMSVA()
        ? {
            category: 'MSVA',
            type: 'MSVA.UNCATEGORIZED',
          }
        : isROB()
        ? {
            category: 'COMPLETE_RECRUITMENT',
            type: 'COMPLETE_RECRUITMENT.RETAKE',
          }
        : {
            category: 'CONTACT_SUNDSVALL',
            type: 'UNCATEGORIZED',
          },
      labels: isLOP()
        ? getDefaultLabels({ category: 'SALARY', type: 'SALARY/UNCATEGORIZED', subType: 'SALARY/UNCATEGORIZED/UNCATEGORIZED' })
        : isIK()
        ? getDefaultLabels({ category: 'KSK_SERVICE_CENTER', type: 'KSK_SERVICE_CENTER/UNCATEGORIZED' })
        : isKA()
        ? getDefaultLabels({ category: 'ADMINISTRATION', type: 'ADMINISTRATION/CONTACT_CENTER', subType: 'ADMINISTRATION/CONTACT_CENTER/GENERAL' })
        : [],
      priority: 'MEDIUM' as SupportPriority,
      status: Status.NEW,
      channel: 'PHONE',
      resolution: Resolution.INFORMED,
      title: 'Empty errand',
    };
    console.log('Creating new empty errand with body', body);
    const res = await this.apiService.post<any, Partial<SupportErrandDto>>({ url, baseURL, data: body }, req.user).catch(e => {
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
  async updateSupportErrand(
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
      if (!s.firstName && !s.organizationName) {
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
          organizationName: s.organizationName,
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
                    : c.type === ContactChannelType.EMAIL || c.type === ContactChannelType.EMAIL
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
      description: !!data?.message ? data?.message : existingSupportErrand.data.description,
      stakeholders: stakeholders,
      // TODO How to map facilities? How are property designations stored in SupportManagement?
      facilities: facilities,
      statuses: [
        {
          statusType: ErrandStatus.ArendeInkommit,
          description: ErrandStatus.ArendeInkommit,
        },
      ],
      extraParameters: [{ key: 'supportManagementErrandNumber', values: [existingSupportErrand.data.errandNumber] }],
    };
    logger.info('Creating new errand in CaseData', caseDataErrand);
    const url = `${municipalityId}/${CASEDATA_NAMESPACE}/errands`;
    const CASEDATA_SERVICE = apiServiceName('case-data');
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
      const existingSupportErrandAttachments = await this.apiService.get<ErrandAttachment[]>(
        { url: supportErrandAttachmentsUrl, baseURL: supportBaseURL },
        req.user,
      );
      const attachmentsPromises: Promise<ErrandAttachment & { fileData: ArrayBuffer }>[] = existingSupportErrandAttachments.data?.map(a => {
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
