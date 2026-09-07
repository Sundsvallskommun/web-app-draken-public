import { IErrand } from '@casedata/interfaces/errand';
import { MEXRelation, PrettyRole, PTRelation, Role } from '@casedata/interfaces/role';
import {
  CasedataOwnerOrContact,
  ContactInfoType,
  CreateStakeholderDto,
  Stakeholder,
  StakeholderType,
} from '@casedata/interfaces/stakeholder';
import { ApiResponse, apiService } from '@common/services/api-service';
import { logClientFailure } from '@common/services/client-diagnostics';
import { formatOrgNr, latestBy, OrgNumberFormat } from '@common/services/helper-service';
import { Admin } from '@common/services/user-service';

import { getErrand } from './casedata-errand-service';

export const getStakeholderEmailOptions = (
  stakeholders: readonly Pick<CasedataOwnerOrContact, 'emails' | 'roles'>[] = []
) =>
  stakeholders.flatMap((stakeholder) =>
    (stakeholder.emails ?? []).map((email) => ({
      email: email.value ?? '',
      role: (PrettyRole as Partial<Record<Role, string>>)[stakeholder.roles[0]] ?? '',
    }))
  );

export const getLastUpdatedAdministrator = (stakeholders: Stakeholder[]) => {
  return latestBy(
    stakeholders?.filter((s) => s.roles.includes(Role.ADMINISTRATOR)),
    'updated'
  );
};

export const fetchStakeholder: (
  municipalityId: string,
  errandId: number,
  stakeholderId: string
) => Promise<ApiResponse<Stakeholder>> = (municipalityId, errandId, stakeholderId) => {
  if (!stakeholderId) {
    logClientFailure('casedata.casedata-stakeholder.fetchStakeholder');
  }
  const url = `/casedata/${municipalityId}/errands/${errandId}/stakeholders/${stakeholderId}`;
  return apiService
    .get<ApiResponse<Stakeholder>>(url)
    .then((res) => res.data)
    .catch((e) => {
      logClientFailure('casedata.casedata-stakeholder.fetchStakeholder', e);
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

export const makeAdministratorStakeholder: (data: Partial<IErrand>) => CreateStakeholderDto | undefined = (data) => {
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
      organizationNumber: formatOrgNr(data.organizationNumber ?? '', OrgNumberFormat.DASH),
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
    extraParameters: {
      extraInformation: data.extraInformation,
    },
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
  if ((data.stakeholders?.length ?? 0) > 0) {
    const items = data
      .stakeholders!.filter(isValidStakeholder)
      .filter((s) => s.newRole !== Role.ADMINISTRATOR)
      .map((s) => {
        return makeStakeholder(s, s.newRole);
      });
    stakeholders = stakeholders.concat(items);
  }
  if (data.administrator) {
    const admin = makeAdministratorStakeholder(data);
    if (admin) {
      stakeholders.push(admin);
    }
  }
  return stakeholders;
};

export const editStakeholder = (municipalityId: string, errandId: string, contact: CasedataOwnerOrContact) => {
  const stakeholder = makeStakeholder(contact, contact.newRole);
  if (!stakeholder.id) {
    logClientFailure('casedata.casedata-stakeholder.editStakeholder');
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
      logClientFailure('casedata.casedata-stakeholder.editStakeholder', e);
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
      logClientFailure('casedata.casedata-stakeholder.addStakeholder', e);
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

  const currentErrande = await getErrand(municipalityId, errand.id.toString());
  const existingAdmins = currentErrande.errand.stakeholders.filter((s) => s.roles.includes(Role.ADMINISTRATOR));

  await Promise.all(
    existingAdmins
      .filter((s) => s.adAccount?.toLowerCase() !== admin.adAccount.toLowerCase())
      .map((s) => removeStakeholder(municipalityId, errand.id.toString(), s.id))
  );

  const existingAdmin = existingAdmins.find((s) => s.adAccount?.toLowerCase() === admin.adAccount.toLowerCase());

  const url = existingAdmin?.id
    ? `casedata/${municipalityId}/errands/${errand.id}/stakeholders/${existingAdmin.id}`
    : `casedata/${municipalityId}/errands/${errand.id}/stakeholders`;

  return apiService.patch<boolean, Partial<CreateStakeholderDto>>(url, stakeholder).catch((e) => {
    logClientFailure('casedata.casedata-stakeholder.setAdministrator', e);
    throw e;
  });
};

export const removeStakeholder = (municipalityId: string, errandId: string, stakeholderId: string) => {
  if (!stakeholderId) {
    logClientFailure('casedata.casedata-stakeholder.removeStakeholder');
    return;
  }
  return apiService
    .deleteRequest<boolean>(`casedata/${municipalityId}/errands/${errandId}/stakeholders/${stakeholderId}`)
    .then((res) => {
      return res;
    })
    .catch((e) => {
      logClientFailure('casedata.casedata-stakeholder.removeStakeholder', e);
      throw e;
    });
};

export const stakeholder2Contact: (s: Stakeholder) => CasedataOwnerOrContact = (s) => {
  return {
    id: s.id,
    clientId: s.clientId ?? '',
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
    zip: s.addresses?.[0]?.postalCode ?? '',
    city: s.addresses?.[0]?.city ?? '',
    newPhoneNumber: '',
    phoneNumbers: (s.contactInformation ?? [])
      .filter((c) => c.contactType === 'PHONE')
      .map((c) => ({
        value: c.value,
      })),
    newEmail: '',
    emails: (s.contactInformation ?? [])
      .filter((c) => c.contactType === 'EMAIL')
      .map((c) => ({
        value: c.value,
      })),
    primaryContact: s.extraParameters?.primaryContact === 'true',
    messageAllowed: s.extraParameters?.messageAllowed === 'true',
    extraInformation: s.extraParameters?.extraInformation ?? '',
  };
};

export const getFellowApplicants: (e: IErrand) => CasedataOwnerOrContact[] = (e) =>
  e.stakeholders?.filter((s) => s.roles.includes(Role.FELLOW_APPLICANT)) || [];

export const getOwnerStakeholder: (e: IErrand) => CasedataOwnerOrContact = (e) =>
  e.stakeholders?.filter((s) => s.roles.includes(Role.APPLICANT))?.[0];

export const getStakeholdersByRelation: (e: IErrand, relation: Role) => CasedataOwnerOrContact[] = (e, relation) =>
  e.stakeholders?.filter((s) => s.roles.includes(relation));

export const getStakeholderRelation: (s: Stakeholder | CasedataOwnerOrContact) => Role | undefined = (s) => {
  const relations = [...Object.keys(MEXRelation), ...Object.keys(PTRelation)];
  if (s.roles.length === 1) {
    return s.roles[0];
  }
  return s.roles.find((r) => relations.includes(r) && r !== Role.APPLICANT && r !== Role.CONTACT_PERSON) || undefined;
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
  c.stakeholderType === 'ORGANIZATION' ? c.organizationName ?? '' : `${c.firstName} ${c.lastName}`;

export const getStakeholderSSN: (c: CasedataOwnerOrContact) => string = (c) => {
  return c.stakeholderType === 'ORGANIZATION'
    ? c.organizationNumber ?? ''
    : c.personalNumber || '(personnummer saknas)';
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
        logClientFailure('casedata.casedata-stakeholder.getSSNFromPersonId', e);
        throw e;
      });
  } else {
    return Promise.resolve('');
  }
};
