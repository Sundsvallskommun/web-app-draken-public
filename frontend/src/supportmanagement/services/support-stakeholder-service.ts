import { RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { SupportAdmin } from './support-admin-service';
import {
  ContactChannelType,
  SupportErrand,
  SupportStakeholder,
  SupportStakeholderFormModel,
  SupportStakeholderRole,
  SupportStakeholderTypeEnum,
} from './support-errand-service';

export const getAdminName = (a: SupportAdmin, r: SupportErrand) => {
  return a && a.firstName && a.lastName ? `${a.firstName} ${a.lastName} (${a.adAccount})` : ``;
};

export const getApplicantName = (r: SupportErrand) => {
  const applicant = r.stakeholders?.find((s) => s.role === SupportStakeholderRole.PRIMARY);
  return applicant ? `${applicant.firstName} ${applicant.lastName}` : '(saknas)';
};

const trimPhoneNumber = (s: string) => s.trim().replace('-', '');

export const applicantHasContactChannel: (errand: SupportErrand) => boolean = (errand) => {
  const applicant = errand.stakeholders?.find((s) => s.role === SupportStakeholderRole.PRIMARY);
  return applicant ? applicant.contactChannels.length > 0 : false;
};

export const applicantContactChannel = (errand: SupportErrand) => {
  const applicant = errand.stakeholders?.find((s) => s.role === SupportStakeholderRole.PRIMARY);
  if (!applicant) {
    return { contactMeans: ContactChannelType.EMAIL, values: [] };
  }

  const contactChannel =
    applicant.contactChannels.find((c) => c.type === ContactChannelType.EMAIL) ||
    applicant.contactChannels.find((c) => c.type === ContactChannelType.PHONE);

  if (!contactChannel) {
    return { contactMeans: ContactChannelType.EMAIL, values: [] };
  }

  return {
    contactMeans: contactChannel.type,
    values: applicant.contactChannels.filter((c) => c.type === contactChannel.type),
  };
};

export const mapExternalIdTypeToStakeholderType = (c: SupportStakeholderFormModel | SupportStakeholder) =>
  c.externalIdType === 'COMPANY' ? SupportStakeholderTypeEnum.ORGANIZATION : SupportStakeholderTypeEnum.PERSON;

const buildStakeholder = (c: SupportStakeholderFormModel, role: SupportStakeholderRole) => {
  if (
    c.externalId ||
    c.organizationName ||
    c.firstName ||
    c.lastName ||
    c.address ||
    c.careOf ||
    c.zipCode ||
    c.city ||
    c.emails.length > 0 ||
    c.phoneNumbers.length > 0
  ) {
    const parameters: { key: string; values: string[]; displayName?: string }[] = [];
    if (c.username) {
      parameters.push({ key: 'username', values: [c.username], displayName: 'Användarnamn' });
    }
    if (c.administrationCode) {
      parameters.push({ key: 'administrationCode', values: [c.administrationCode], displayName: 'Förvaltningskod' });
    }
    if (c.administrationName) {
      parameters.push({ key: 'administrationName', values: [c.administrationName], displayName: 'Förvaltningsnamn' });
    }
    const stakeholder: SupportStakeholder = {
      stakeholderType: mapExternalIdTypeToStakeholderType(c),
      externalId: c.externalId || c.organizationNumber,
      externalIdType: c.externalIdType,
      role,
      organizationName: c.organizationName,
      firstName: c.firstName,
      lastName: c.lastName,
      address: c.address,
      zipCode: c.zipCode,
      city: c.city,
      careOf: c.careOf,
      country: 'SVERIGE',
      contactChannels: [
        ...c.emails.map((e) => ({ type: 'Email', value: e.value })),
        ...c.phoneNumbers.map((e) => ({ type: 'Phone', value: trimPhoneNumber(e.value) })),
      ],
      parameters,
    };
    return stakeholder;
  }
  return undefined;
};

export const buildStakeholdersList = (data: Partial<RegisterSupportErrandFormModel>) => {
  const stakeholders: SupportStakeholder[] = [];
  if (data.customer && data.customer?.length > 0) {
    const c = data.customer[0];
    const customer = buildStakeholder(c, SupportStakeholderRole.PRIMARY);
    if (customer) {
      stakeholders.push(customer);
    }
  }
  data.contacts?.forEach((c) => {
    const stakeholder = buildStakeholder(c, SupportStakeholderRole.CONTACT);
    if (stakeholder) {
      stakeholders.push(stakeholder);
    }
  });
  return stakeholders;
};
