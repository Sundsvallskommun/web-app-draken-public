import { HttpException } from '@exceptions/HttpException';
import { RequestWithUser } from '@interfaces/auth.interface';
import authMiddleware from '@middlewares/auth.middleware';
import { hasAnyPermission } from '@middlewares/permissions.middleware';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import { CitizenService } from '@services/citizen.service';
import { Type as TypeTransformer } from 'class-transformer';
import { IsString, ValidateNested } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { Body, Controller, Get, Param, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import { LEAddress, LegalEntity2, LEPostAddress } from '@/data-contracts/legalentity/data-contracts';
import { logger } from '@/utils/logger';
import { formatOrgNr, OrgNumberFormat } from '@/utils/util';

class SsnPayload {
  @IsString()
  ssn!: string;
}

/**
 * Person lookups per case worker and minute. Well above what a case worker does by hand or with
 * ACE screen pops, but it stops a script from walking through the population register.
 * Counted in memory per BFF process: with several instances the limit applies per instance, and a
 * restart resets it. A shared store (the Redis used for sessions) would make it global.
 */
const PERSON_LOOKUPS_PER_MINUTE = 30;

const personLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: PERSON_LOOKUPS_PER_MINUTE,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as RequestWithUser).user?.username ?? ipKeyGenerator(req.ip ?? ''),
  handler: (req: Request, res: Response, _next: NextFunction) => {
    logger.warn(`AUDIT person lookup rate limited: user=${(req as RequestWithUser).user?.username ?? 'unknown'}`);
    res.status(429).send({ message: 'Too many person lookups' });
  },
});

type LookupKind = 'person' | 'employee';

/** Records who looked up whom (by party id, never by personal number) and with what outcome. */
const auditPersonLookup = (kind: LookupKind, user: RequestWithUser['user'], outcome: 'found' | 'not found' | 'failed', partyId = '') => {
  const fields = [`user=${user?.username ?? 'unknown'}`, `outcome=${outcome}`, ...(partyId ? [`partyId=${partyId}`] : [])];
  logger.info(`AUDIT ${kind} lookup: ${fields.join(' ')}`);
};

const NOT_PROTECTED = new Set(['', 'N', 'NEJ', 'FALSE', '0']);

/**
 * Whether Citizen marks the person's data as protected (skyddade personuppgifter) in classified or
 * protectedNR. Their values are not specified, so anything but an explicit no counts as protected.
 */
const isProtectedIdentity = (citizen: Pick<Citizenaddress, 'classified' | 'protectedNR'>): boolean =>
  [citizen.classified, citizen.protectedNR].some(value => !NOT_PROTECTED.has((value ?? '').trim().toUpperCase()));

class OrgNrPayload {
  @IsString()
  orgNr!: string;
}

interface Citizenaddress {
  personId: string;
  givenname: string;
  lastname: string;
  gender: string;
  civilStatus: string;
  nrDate: string;
  classified: string;
  protectedNR: string;
  /** Set by the BFF: the person has protected personal data and addresses is left empty. */
  protectedIdentity?: boolean;
  addresses: {
    realEstateDescription: string;
    co?: string;
    address: string;
    addressArea?: string;
    addressNumber?: string;
    addressLetter?: string;
    appartmentNumber: string;
    postalCode: string;
    city: string;
    municipality: string;
    country: string;
    emigrated: boolean;
    addressType: string;
  }[];
}

interface EmployeeAddress {
  personid: string;
  givenname: string;
  lastname: string;
  fullname: string;
  address: string;
  postalCode: string;
  city: string;
  workPhone: string;
  mobilePhone: string;
  aboutMe: string;
  email: string;
  mailNickname: string;
  company: string;
  companyId: number;
  title: string;
  orgTree: string;
  referenceNumber: string;
  isManager: boolean;
  loginName: string;
  department: string;
}

interface EmployedPersonData {
  domain: string;
  loginName: string;
}

class CLEPostAddress implements LEPostAddress {
  @IsString()
  coAdress?: string | null;
  @IsString()
  country?: string | null;
  @IsString()
  postalCode?: string | null;
  @IsString()
  city?: string | null;
  @IsString()
  address1?: string | null;
  @IsString()
  address2?: string | null;
}

class CLEAddress implements LEAddress {
  @IsString()
  addressArea?: string | null;
  @IsString()
  adressNumber?: string | null;
  @IsString()
  city?: string | null;
  @IsString()
  postalCode?: string | null;
  @IsString()
  municipality?: string | null;
  @IsString()
  county?: string | null;
}

class CLegalEntity2 implements LegalEntity2 {
  @IsString()
  legalEntityId?: string | null;
  @IsString()
  organizationNumber?: string | null;
  @IsString()
  name?: string | null;
  @ValidateNested()
  @TypeTransformer(() => CLEPostAddress)
  postAddress?: LEPostAddress;
  @ValidateNested()
  @TypeTransformer(() => CLEAddress)
  address?: LEAddress;
  @IsString()
  phoneNumber?: string | null;
}

interface LegalEntity2WithId {
  partyId: string;
}
class CLegalEntity2WithId extends CLegalEntity2 implements LegalEntity2WithId {
  @IsString()
  partyId!: string;
}

interface ResponseData {
  data: Citizenaddress | LegalEntity2;
  message: string;
}

@Controller()
export class AddressController {
  private apiService = new ApiService();
  private citizenService = new CitizenService();
  CITIZEN_SERVICE = apiServiceName('citizen');
  EMPLOYEE_SERVICE = apiServiceName('employee');
  LEGALENTITY_SERVICE = apiServiceName('legalentity');
  PARTY_SERVICE = apiServiceName('party');

  @Post('/address/')
  @OpenAPI({ summary: 'Return adress for given person number' })
  @UseBefore(
    authMiddleware,
    hasAnyPermission(['canEditSupportManagement', 'canEditCasedata']),
    personLookupLimiter,
    validationMiddleware(SsnPayload, 'body'),
  )
  async cases(@Req() req: RequestWithUser, @Res() response: any, @Body() ssnPayload: SsnPayload): Promise<ResponseData> {
    const partyId = await this.resolvePartyId('person', req, ssnPayload.ssn);
    const url = `${this.CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${partyId}`;
    const res = await this.apiService.get<Citizenaddress>({ url }, req.user).catch(e => {
      auditPersonLookup('person', req.user, 'failed', partyId);
      throw e;
    });
    auditPersonLookup('person', req.user, 'found', partyId);
    // A protected address never leaves the BFF, so it can neither be shown nor saved on an errand.
    const protectedIdentity = isProtectedIdentity(res.data);
    const data = protectedIdentity ? { ...res.data, addresses: [] } : res.data;
    return { data: { ...data, protectedIdentity }, message: 'success' };
  }

  /** The party id of the person with this personal number; answers 404 when there is none. */
  private async resolvePartyId(kind: LookupKind, req: RequestWithUser, personNumber: string): Promise<string> {
    const partyId = await this.citizenService.getPartyIdByPersonNumber(MUNICIPALITY_ID!, personNumber, req.user).catch(e => {
      auditPersonLookup(kind, req.user, 'failed');
      throw e;
    });
    if (!partyId) {
      auditPersonLookup(kind, req.user, 'not found');
      throw new HttpException(404, 'Person not found');
    }
    return partyId;
  }

  @Post('/organization/')
  @OpenAPI({ summary: 'Return info for given organization number' })
  @ResponseSchema(CLegalEntity2WithId)
  @UseBefore(authMiddleware, validationMiddleware(OrgNrPayload, 'body'))
  async organization(@Req() req: RequestWithUser, @Res() response: any, @Body() orgNrPayload: OrgNrPayload): Promise<ResponseData> {
    const formattedOrgNr = formatOrgNr(orgNrPayload.orgNr, OrgNumberFormat.NODASH);
    const guidUrl = `${this.PARTY_SERVICE}/${MUNICIPALITY_ID}/ENTERPRISE/${formattedOrgNr}/partyId`;
    const guidRes = await this.apiService.get<string>({ url: guidUrl }, req.user);

    const url = `${this.LEGALENTITY_SERVICE}/${MUNICIPALITY_ID}/${guidRes.data}`;

    const res = await this.apiService.get<LegalEntity2>({ url }, req.user);

    const result: LegalEntity2WithId = { ...res.data, partyId: guidRes.data };

    return { data: result, message: 'success' } as ResponseData;
  }

  @Get('/portalpersondata/personal/:loginName')
  @OpenAPI({ summary: 'Fetch user information for given AD user' })
  @UseBefore(authMiddleware)
  async username(
    @Req() req: RequestWithUser,
    @Param('loginName') loginName: string,
    @Res() _response: any,
  ): Promise<{ data: EmployeeAddress; message: string } | undefined> {
    const baseUrl = `${this.EMPLOYEE_SERVICE}/${MUNICIPALITY_ID}/portalpersondata/PERSONAL/${loginName}`;
    const res = await this.apiService.get<EmployeeAddress>({ url: baseUrl }, req.user).catch(e => {
      logger.error('Error when fetching user information');
      throw e;
    });
    const personId = res.data?.personid;

    if (personId) {
      const empUrl = `${this.EMPLOYEE_SERVICE}/${MUNICIPALITY_ID}/employments?personId=${personId}`;
      const empRes = await this.apiService.get<any[]>({ url: empUrl }, req.user).catch(_e => {
        logger.error('Error when fetching employment data');
        return { data: [] };
      });
      const data = empRes?.data?.[0];
      const employment = data?.employments?.[0];
      if (data && employment) {
        res.data.title = employment?.title || '';
        res.data.referenceNumber = data?.referenceNumbers?.[0]?.referenceNumber || '';
        res.data.department = employment?.orgName || '';
      }

      return {
        data: res.data,
        message: 'success',
      };
    }
  }

  @Post('/employed/loginname')
  @OpenAPI({ summary: 'Fetch employed user information' })
  @UseBefore(
    authMiddleware,
    hasAnyPermission(['canEditSupportManagement', 'canEditCasedata']),
    personLookupLimiter,
    validationMiddleware(SsnPayload, 'body'),
  )
  async employed(
    @Req() req: RequestWithUser,
    @Body() ssnPayload: SsnPayload,
    @Res() _response: any,
  ): Promise<{ data: EmployedPersonData; message: string }> {
    const partyId = await this.resolvePartyId('employee', req, ssnPayload.ssn);
    const url = `${this.EMPLOYEE_SERVICE}/${MUNICIPALITY_ID}/employed/${partyId}/accounts`;
    const res = await this.apiService.get<EmployedPersonData>({ url }, req.user).catch(e => {
      logger.error('Error when fetching employed user information');
      auditPersonLookup('employee', req.user, 'failed', partyId);
      throw e;
    });
    auditPersonLookup('employee', req.user, 'found', partyId);
    return { data: res.data, message: 'success' };
  }
}
