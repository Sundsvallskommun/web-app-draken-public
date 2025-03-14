import { ApiResponse, apiService, Data } from '@common/services/api-service';
import { formatOrgNr, luhnCheck, OrgNumberFormat } from '@common/services/helper-service';
import { CLegalEntity2WithId } from 'src/data-contracts/backend/data-contracts';

export interface CitizenAddressData extends Data {
  personId: string;
  givenname: string;
  lastname: string;
  addresses: {
    realEstateDescription: string;
    co: string;
    address: string;
    addressArea: string;
    addressNumber: string;
    addressLetter: string;
    apartmentNumber: string;
    postalCode: string;
    city: string;
    country: string;
  }[];
}

export interface AddressResult {
  personId: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  street: string;
  careof: string;
  zip: string;
  city: string;
  phone?: string;
  email?: string;
  workPhone?: string;
  error?: string;
  loginName: string;
  company: string;
  administrationCode: string;
  administrationName: string;
}

const emptyaddress: AddressResult = {
  personId: null,
  firstName: '',
  lastName: '',
  organizationName: '',
  street: '',
  careof: '',
  zip: '',
  city: '',
  loginName: '',
  company: '',
  administrationCode: '',
  administrationName: '',
};

interface OrgInfo extends Data {
  errorInformation?: {
    hasErrors: boolean;
    errorDescription?: {
      '-1': string;
    };
  };
  companyName: string;
  legalForm: {
    legalFormDescription: string;
    legalFormCode: string;
  };
  address: {
    city: string;
    street: string;
    postcode?: string;
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
  companyLocation?: {
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

interface EmployedPersonData {
  domain: string;
  loginName: string;
}

export const isValidPersonalNumber: (ssn: string) => boolean = (ssn) =>
  luhnCheck(ssn) && ((ssn.length === 12 && parseInt(ssn[4]) < 2) || (ssn.length === 10 && parseInt(ssn[2]) < 2));

export const isValidOrgNumber: (ssn: string) => boolean = (ssn) => {
  const nodashed = formatOrgNr(ssn, OrgNumberFormat.NODASH);
  const passingLuhn = luhnCheck(nodashed);
  const passingDigitTest = parseInt(nodashed?.[2]) > 1;
  return passingLuhn && passingDigitTest;
};

export const searchPerson: (ssn: string) => Promise<AddressResult> = (ssn: string) => {
  ssn = ssn.replace(/\D/g, '');
  return !isValidPersonalNumber(ssn)
    ? Promise.resolve(undefined)
    : apiService
        .post<ApiResponse<CitizenAddressData>, { ssn: string }>('address', { ssn: ssn })
        .then((res) => {
          return res.data.data;
        })
        .then((res) => {
          if (res.error) {
            throw 'Address not found';
          } else {
            const addressItem = res.addresses?.[0];
            return {
              personId: res.personId,
              firstName: res.givenname,
              lastName: res.lastname,
              organizationName: '',
              street: addressItem?.address || '',
              careof: addressItem?.co || '',
              zip: addressItem?.postalCode || '',
              city: addressItem?.city || '',
            };
          }
        });
};

export const isValidADUsername: (username: string) => boolean = (username) => username?.length === 8;

export const parseAdministrationInfo: (orgTree: string) => {
  administrationCode: string;
  administrationName: string;
} = (orgTree) => {
  return {
    administrationCode: orgTree.split('¤')[0].split('|')[1].toString(),
    administrationName: orgTree.split('¤')[0].split('|')[2].toString(),
  };
};

export const searchADUser: (username: string, domain?: string) => Promise<AddressResult> = async (
  username: string,
  domain?: string
) => {
  if (!domain) {
    domain = 'PERSONAL';
  }

  return await apiService
    .get<any>(`portalpersondata/${domain}/${username}`)
    .then((res) => {
      return {
        personId: res.data.data.personid,
        firstName: res.data.data.givenname,
        lastName: res.data.data.lastname,
        email: res.data.data.email,
        phone: res.data.data.mobilePhone,
        workPhone: res.data.data.workPhone,
        organizationName: '',
        street: res.data.data.street,
        city: res.data.data.city,
        zip: res.data.data.postalCode,
        careof: res.data.data.careof,
        loginName: username,
        company: res.data.data.company,
        administrationCode: parseAdministrationInfo(res.data.data.orgTree).administrationCode,
        administrationName: parseAdministrationInfo(res.data.data.orgTree).administrationName,
        // metadata: parseAdministrationInfo(res.data.data.orgTree),
      } as AddressResult;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching AD-user');
      throw e;
    });
};

export const searchADUserByPersonNumber: (personalNumber: string) => Promise<AddressResult | AddressResult[]> = async (
  personalNumber: string
) => {
  personalNumber = personalNumber.replace(/\D/g, '');
  return !isValidPersonalNumber(personalNumber)
    ? Promise.resolve([])
    : await apiService
        .get<ApiResponse<EmployedPersonData[]>>(`employed/${personalNumber}/loginname`)
        .then((res) => res.data.data)
        .then((res) => {
          if (res.length > 1) {
            const promises = res.map((user) => searchADUser(user.loginName, user.domain));
            return Promise.all(promises).then((results) => results);
          } else {
            return searchADUser(res[0].loginName, res[0].domain);
          }
        });
};

const isValidOrganization = (org: CLegalEntity2WithId) =>
  org.name &&
  ((org.address?.city && org.address?.postalCode && org.address.addressArea) ||
    (org.address?.addressArea && org.address?.city && org.address?.postalCode));

export const searchOrganization: (orgNr: string) => Promise<AddressResult> = (orgNr: string) => {
  return !isValidOrgNumber(formatOrgNr(orgNr))
    ? Promise.resolve(undefined)
    : apiService
        .post<ApiResponse<CLegalEntity2WithId>, { orgNr: string }>('organization', {
          orgNr: formatOrgNr(orgNr, OrgNumberFormat.NODASH),
        })
        .then((res) => res.data.data)
        .then((res) => {
          if (!isValidOrganization(res)) {
            console.error('Invalid address data for organization');
            throw 'Address not found';
          } else {
            const addressItem = {
              city: res.address.city,
              postcode: res.address.postalCode,
              street: res.address.addressArea,
            };
            return {
              personId: undefined,
              firstName: undefined,
              lastName: undefined,
              organizationName: res.name,
              street: addressItem.street,
              careof: undefined,
              zip: addressItem.postcode,
              city: addressItem.city,
              phone: res.phoneNumber || '',
            } as AddressResult;
          }
        });
};

export const fetchPersonId: (ssn: string) => Promise<{
  personId: string;
}> = (ssn: string) => {
  return apiService
    .post<ApiResponse<CitizenAddressData>, { ssn: string }>('personid', { ssn })
    .then((res) => res.data.data)
    .then((res) => {
      if (res.error) {
        throw 'Person ID not found';
      } else {
        return {
          personId: res.personId,
        };
      }
    })
    .catch((e) => {
      console.error('Error when fetching personId');
      return { personId: null, error: 'personId not found' };
    });
};