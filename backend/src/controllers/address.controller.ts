import { RequestWithUser } from '@interfaces/auth.interface';
import { validationMiddleware } from '@middlewares/validation.middleware';
import ApiService from '@services/api.service';
import authMiddleware from '@middlewares/auth.middleware';
import { IsString } from 'class-validator';
import { Body, Controller, Get, Param, Post, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { formatOrgNr, OrgNumberFormat } from '@/utils/util';
import { MUNICIPALITY_ID } from '@/config';
import { logger } from '@/utils/logger';

class SsnPayload {
  @IsString()
  ssn: string;
}

class OrgNrPayload {
  @IsString()
  orgNr: string;
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
  addresses: [
    {
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
    },
  ];
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
  orgTree: string;
  referenceNumber: string;
  isManager: boolean;
  loginName: string;
}

interface EmployedPersonData {
  domain: string;
  loginName: string;
}

interface OrgInfo {
  companyName: string;
  legalForm: {
    legalFormDescription: string;
    legalFormCode: string;
  };
  address: {
    city: string;
    street: string;
    careOf: string;
  };
  phoneNumber: string;
  municipality: {
    municipalityName: string;
    municipalityCode: string;
  };
  county: {
    countyName: string;
    countyCode: string;
  };
  fiscalYear: {
    fromDay: number;
    fromMonth: number;
    toDay: number;
    toMonth: number;
  };
  companyForm: {
    companyFormCode: string;
    companyFormDescription: string;
  };
  companyRegistrationTime: string;
  companyLocation: {
    address: {
      city: string;
      street: string;
      postcode: string;
    };
  };
  businessSignatory: string;
  companyDescription: string;
  sharesInformation: {
    shareTypes: string[];
    numberOfShares: number;
    shareCapital: number;
    shareCurrency: string;
  };
}

interface ResponseData {
  data: Citizenaddress | OrgInfo;
  message: string;
}

interface PersonIdResponseData {
  data: { personId: string };
  message: string;
}

const MOCKDATAFORTEST: ResponseData = {
  data: {
    personId: 'test-guid',
    givenname: 'Tomas',
    lastname: 'Testsson',
    gender: 'K',
    civilStatus: 'OG',
    nrDate: '20121201',
    classified: 'N',
    protectedNR: 'N',
    addresses: [
      {
        realEstateDescription: 'Test',
        address: 'Testgatan 1',
        appartmentNumber: 'LGH 1',
        postalCode: '12345',
        city: 'TESTSTAD',
        municipality: '2281',
        country: 'SVERIGE',
        emigrated: false,
        addressType: 'POPULATION_REGISTRATION_ADDRESS',
      },
    ],
  },
  message: 'success',
};

@Controller()
export class AddressController {
  private apiService = new ApiService();

  @Post('/address/')
  @OpenAPI({ summary: 'Return adress for given person number' })
  @UseBefore(authMiddleware, validationMiddleware(SsnPayload, 'body'))
  async cases(@Req() req: RequestWithUser, @Res() response: any, @Body() ssnPayload: SsnPayload): Promise<ResponseData> {
    const guidUrl = `citizen/2.0/${ssnPayload.ssn}/guid`;
    const guidRes = await this.apiService.get<string>({ url: guidUrl }, req.user);

    const url = `citizen/2.0/${guidRes.data}`;
    const res = await this.apiService.get<Citizenaddress>({ url }, req.user);

    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Post('/personid/')
  @OpenAPI({ summary: 'Return personId for given person number' })
  @UseBefore(authMiddleware, validationMiddleware(SsnPayload, 'body'))
  async personId(@Req() req: RequestWithUser, @Res() response: any, @Body() ssnPayload: SsnPayload): Promise<PersonIdResponseData> {
    const guidUrl = `citizen/2.0/${ssnPayload.ssn}/guid`;
    const guidRes = await this.apiService.get<string>({ url: guidUrl }, req.user);

    const url = `citizen/2.0/citizen/${guidRes.data}`;
    const res = await this.apiService.get<Citizenaddress>({ url }, req.user);

    return { data: { personId: res.data.personId }, message: 'success' } as PersonIdResponseData;
  }

  @Post('/organization/')
  @OpenAPI({ summary: 'Return info for given organization number' })
  @UseBefore(authMiddleware, validationMiddleware(OrgNrPayload, 'body'))
  async organization(@Req() req: RequestWithUser, @Res() response: any, @Body() orgNrPayload: OrgNrPayload): Promise<ResponseData> {
    const formattedOrgNr = formatOrgNr(orgNrPayload.orgNr, OrgNumberFormat.NODASH);
    const guidUrl = `party/1.0/ENTERPRISE/${formattedOrgNr}/partyId`;
    const guidRes = await this.apiService.get<string>({ url: guidUrl }, req.user);

    const url = `businessengagements/2.0/${MUNICIPALITY_ID}/information/${guidRes.data}`;

    const res = await this.apiService.get<OrgInfo>({ url }, req.user);

    return { data: res.data, message: 'success' } as ResponseData;
  }

  @Get('/portalpersondata/personal/:loginName')
  @OpenAPI({ summary: 'Fetch user information for given AD user' })
  @UseBefore(authMiddleware)
  async username(
    @Req() req: RequestWithUser,
    @Param('loginName') loginName: string,
    @Res() response: any,
  ): Promise<{ data: EmployeeAddress; message: string }> {
    const url = `employee/1.0/portalpersondata/PERSONAL/${loginName}`;
    const res = await this.apiService.get<EmployeeAddress>({ url }, req.user).catch(e => {
      logger.error('Error when fetching user information');
      throw e;
    });
    return { data: res.data, message: 'success' };
  }

  @Get('/employed/:personalNumber/loginname')
  @OpenAPI({ summary: 'Fetch employed user information' })
  @UseBefore(authMiddleware)
  async employed(
    @Req() req: RequestWithUser,
    @Param('personalNumber') personalNumber: string,
    @Res() response: any,
  ): Promise<{ data: EmployedPersonData; message: string }> {
    const url = `employee/1.0/employed/${personalNumber}/loginname`;
    const res = await this.apiService.get<EmployedPersonData>({ url }, req.user).catch(e => {
      logger.error('Error when fetching employed user information');
      throw e;
    });
    return { data: res.data, message: 'success' };
  }
}
