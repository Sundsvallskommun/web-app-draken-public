import { IErrand } from '@casedata/interfaces/errand';
import { Relation, Role } from '@casedata/interfaces/role';
import {
  CasedataOwnerOrContact,
  ContactInfoType,
  CreateStakeholderDto,
  Stakeholder,
  StakeholderType,
} from '@casedata/interfaces/stakeholder';
import { ApiResponse, apiService } from '@common/services/api-service';
import { OrgNumberFormat, formatOrgNr, latestBy } from '@common/services/helper-service';
import { Admin } from '@common/services/user-service';
import { getErrand } from './casedata-errand-service';

export const getLastUpdatedAdministrator = (stakeholders: Stakeholder[]) => {
  return latestBy(
    stakeholders?.filter((s) => s.roles.includes(Role.ADMINISTRATOR)),
    'updated'
  );
};

export const fetchStakeholder: (stakeholderId: string) => Promise<ApiResponse<Stakeholder>> = (stakeholderId) => {
  if (!stakeholderId) {
    console.error('No stakeholder id found, cannot fetch. Returning.');
  }
  const url = `stakeholders/${stakeholderId}`;
  return apiService
    .get<ApiResponse<Stakeholder>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching stakeholder: ', stakeholderId);
      throw e;
    });
};

const determineStakeholderType: (data: CasedataOwnerOrContact | Stakeholder) => StakeholderType = (data) => {
  if (data.organizationNumber) {
    return 'ORGANIZATION';
  } else {
    return 'PERSON';
  }
};

export const makeAdministratorStakeholder: (data: Partial<IErrand>) => CreateStakeholderDto = (data) => {
  // TODO This async handling of administrators - fetching from api and using string matching
  // when registering errand needs to be improved. Hopefully this will be possible when
  // administrator stakeholders are real AD users with all data
  return data.administrator?.firstName && data.administrator?.lastName
    ? {
        type: determineStakeholderType(data.administrator),
        roles: data.administrator?.roles || [Role.ADMINISTRATOR],
        contactInformation: data.administrator?.contactInformation || [],
        firstName: data.administrator?.firstName,
        lastName: data.administrator?.lastName,
        adAccount: data.administrator?.adAccount,
        extraParameters: {},
      }
    : undefined;
};

export const makeStakeholder: (data: CasedataOwnerOrContact, role: Role) => CreateStakeholderDto = (data, role) => {
  const phones =
    data.phoneNumbers?.map((p) => ({
      contactType: 'PHONE' as ContactInfoType,
      value: p.value,
    })) || [];
  const mails =
    data.emails?.map((p) => ({
      contactType: 'EMAIL' as ContactInfoType,
      value: p.value,
    })) || [];
  return {
    ...(data.id && { id: data.id }),
    ...(data.personId && { personId: data.personId.toString() }),
    type: data.stakeholderType,
    roles: [role, ...(data.relation ? [data.relation as Role] : [])],
    contactInformation: [...phones, ...mails],
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    organizationName: data.organizationName || '',
    ...(data.stakeholderType === 'ORGANIZATION' && {
      organizationNumber: formatOrgNr(data.organizationNumber, OrgNumberFormat.DASH),
    }),
    addresses: [
      {
        addressCategory: 'POSTAL_ADDRESS',
        street: data.street || '',
        apartmentNumber: '',
        postalCode: data.zip || '',
        city: data.city || '',
        careOf: data.careof || '',
      },
    ],
    adAccount: data.adAccount,
    extraParameters: {},
  };
};

// const validateAddressInfo: (a: Address) => boolean = (a) =>
//   a.addressCategory &&
//   a.addressCategory === 'POSTAL_ADDRESS' &&
//   (!!a.street || !!a.city || !!a.postalCode || !!a.careOf);

const isValidStakeholder: (c: CasedataOwnerOrContact) => boolean = (c) => {
  return (
    (c.stakeholderType === 'PERSON' && c.firstName !== '') ||
    (c.stakeholderType === 'ORGANIZATION' && c.organizationName !== '')
  );
};

export const makeStakeholdersList: (data: Partial<IErrand>) => Partial<CreateStakeholderDto>[] = (data) => {
  let stakeholders: Partial<CreateStakeholderDto>[] = [];
  // if (data.owner?.length === 1 && isValidStakeholder(data.owner[0])) {
  //   stakeholders.push(makeStakeholder(data.owner[0], Role.APPLICANT));
  // }
  // if (data.contacts?.length > 0) {
  //   const contacts = data.contacts.map((c) => {
  //     return makeStakeholder(c, Role.CONTACT_PERSON);
  //   });
  //   stakeholders = stakeholders.concat(contacts);
  // }
  if (data.stakeholders?.length > 0) {
    const items = data.stakeholders.filter(isValidStakeholder).map((s) => {
      return makeStakeholder(s, s.newRole);
    });
    stakeholders = stakeholders.concat(items);
  }
  if (data.administrator) {
    const admin = makeAdministratorStakeholder(data);
    stakeholders.push(admin);
  }
  return stakeholders;
};

export const editStakeholder = (municipalityId: string, errandId: string, contact: CasedataOwnerOrContact) => {
  const stakeholder = makeStakeholder(contact, contact.newRole);
  if (!stakeholder.id) {
    console.error('No id found, cannot update stakeholder.');
    return Promise.resolve(false);
  }

  return apiService
    .patch<boolean, Partial<CreateStakeholderDto>>(
      `casedata/${municipalityId}/errands/${errandId}/stakeholders/${stakeholder.id}`,
      stakeholder
    )
    .then((res) => {
      return res;
    })
    .catch((e) => {
      console.error('Something went wrong when creating attachment ', stakeholder);
      throw e;
    });
};

export const addStakeholder = (municipalityId: string, errandId: string, contact: CasedataOwnerOrContact) => {
  const stakeholder = makeStakeholder(contact, contact.newRole);

  return apiService
    .patch<boolean, Partial<CreateStakeholderDto>>(
      `casedata/${municipalityId}/errands/${errandId}/stakeholders`,
      stakeholder
    )
    .then((res) => {
      return res;
    })
    .catch((e) => {
      console.error('Something went wrong when creating stakeholder ', stakeholder);
      throw e;
    });
};

export const setAdministrator = async (municipalityId: string, errand: IErrand, admin: Admin) => {
  const stakeholder: CreateStakeholderDto = {
    roles: [Role.ADMINISTRATOR],
    type: 'PERSON',
    firstName: admin.firstName,
    lastName: admin.lastName,
    adAccount: admin.adAccount,
  };
  const currentErrande = await getErrand(errand.municipalityId, errand.id.toString());
  const existingAdministrator = currentErrande.errand.administrator;
  const url = existingAdministrator?.id
    ? `casedata/${municipalityId}/errands/${errand.id}/stakeholders/${existingAdministrator.id}`
    : `casedata/${municipalityId}/errands/${errand.id}/stakeholders`;
  return apiService.patch<boolean, Partial<CreateStakeholderDto>>(url, stakeholder).catch((e) => {
    console.error('Something went wrong when setting stakeholder ', stakeholder);
    throw e;
  });
};

export const removeStakeholder = (municipalityId: string, errandId: string, stakeholderId: string) => {
  if (!stakeholderId) {
    console.error('No id found, cannot continue.');
    return;
  }
  return apiService
    .deleteRequest<boolean>(`casedata/${municipalityId}/errands/${errandId}/stakeholders/${stakeholderId}`)
    .then((res) => {
      return res;
    })
    .catch((e) => {
      console.error('Something went wrong when removing stakeholder ', stakeholderId);
      throw e;
    });
};

export const stakeholder2Contact: (s: Stakeholder) => CasedataOwnerOrContact = (s) => {
  return {
    id: s.id,
    stakeholderType: s.type,
    roles: s.roles,
    newRole: s.roles?.[0] || Role.CONTACT_PERSON,
    personalNumber: s.personalNumber || '',
    personId: s.personId || '',
    organizationName: s.organizationName || '',
    organizationNumber: s.organizationNumber || '',
    relation: getStakeholderRelation(s),
    firstName: s.firstName || '',
    lastName: s.lastName || '',
    street: s.addresses?.[0]?.street || '',
    careof: s.addresses?.[0]?.careOf || '',
    zip: s.addresses?.[0]?.postalCode,
    city: s.addresses?.[0]?.city,
    newPhoneNumber: '+46',
    phoneNumbers: s.contactInformation
      .filter((c) => c.contactType === 'PHONE')
      .map((c) => ({
        value: c.value,
      })),
    newEmail: '',
    emails: s.contactInformation
      .filter((c) => c.contactType === 'EMAIL')
      .map((c) => ({
        value: c.value,
      })),
    primaryContact: s.extraParameters.primaryContact === 'true',
    messageAllowed: s.extraParameters.messageAllowed === 'true',
  };
};

export const getFellowApplicants: (e: IErrand) => CasedataOwnerOrContact[] = (e) =>
  e.stakeholders?.filter((s) => s.roles.includes(Role.FELLOW_APPLICANT)) || [];

export const getOwnerStakeholder: (e: IErrand) => CasedataOwnerOrContact = (e) =>
  e.stakeholders?.filter((s) => s.roles.includes(Role.APPLICANT))?.[0];

export const getStakeholdersByRelation: (e: IErrand, relation: Role) => CasedataOwnerOrContact[] = (e, relation) =>
  e.stakeholders?.filter((s) => s.roles.includes(relation));

export const getStakeholderRelation: (s: Stakeholder | CasedataOwnerOrContact) => Role = (s) => {
  const relations = Object.entries(Relation).map(([key, value]) => key);
  return s.roles.find((r) => relations.includes(r)) || undefined;
};

export const validateOwnerForSendingDecision: (e: IErrand) => boolean = (e) =>
  validateOwnerForSendingDecisionByEmail(e) || validateOwnerForSendingDecisionByLetter(e);

export const validateOwnerForSendingDecisionByEmail: (e: IErrand) => boolean = (e) => {
  const owner = getOwnerStakeholder(e);
  return owner && owner.emails.length > 0;
};

export const validateOwnerForSendingDecisionByLetter: (e: IErrand) => boolean = (e) => {
  const owner = getOwnerStakeholder(e);
  return owner && !!owner.personId;
};

export const getStakeholderName: (c: CasedataOwnerOrContact) => string = (c) =>
  c.stakeholderType === 'ORGANIZATION' ? c.organizationName : `${c.firstName} ${c.lastName}`;

export const getStakeholderSSN: (c: CasedataOwnerOrContact) => string = (c) => {
  return c.stakeholderType === 'ORGANIZATION' ? c.organizationNumber : c.personalNumber || '(personnummer saknas)';
};

export const getSSNFromPersonId: (municipalityId: string, personId: string) => Promise<string> = (
  municipalityId,
  personId
) => {
  if (personId) {
    return apiService
      .post<ApiResponse<string>, { personId: string }>(`casedata/${municipalityId}/stakeholders/personNumber`, {
        personId,
      })
      .then((res) => res.data.data)
      .catch((e) => {
        console.error('Something went wrong when fetching personnumber: ', personId);
        throw e;
      });
  } else {
    return;
  }
};
