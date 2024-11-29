import { apiService } from '@common/services/api-service';
import { RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { SupportAdmin } from './support-admin-service';
import {
  ApiSupportErrand,
  ContactChannelType,
  SupportErrand,
  SupportErrandDto,
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

export const buildStakeholdersList = (data: Partial<RegisterSupportErrandFormModel>) => {
  const stakeholders: SupportStakeholder[] = [];
  if (data.customer && data.customer?.length > 0) {
    const c = data.customer[0];
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
      const customer: SupportStakeholder = {
        stakeholderType: mapExternalIdTypeToStakeholderType(c),
        externalId: c.externalId || c.organizationNumber,
        externalIdType: c.externalIdType,
        role: SupportStakeholderRole.PRIMARY,
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
        ...(c.loginName && { parameters: [{ key: 'username', values: [c.loginName], displayName: 'Användarnamn' }] }),
        metadata: data.customer[0].metadata,
      };
      stakeholders.push(customer);
    }
  }
  data.contacts?.forEach((c) => {
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
      stakeholders.push({
        stakeholderType: mapExternalIdTypeToStakeholderType(c),
        externalId: c.externalId || c.organizationNumber,
        externalIdType: c.externalIdType,
        role: SupportStakeholderRole.CONTACT,
        organizationName: c.organizationName,
        // TODO map organization name to its own field when this has been added in the API
        firstName: c.firstName || c.organizationName,
        lastName: c.lastName,
        address: c.address,
        careOf: c.careOf,
        zipCode: c.zipCode,
        city: c.city,
        country: 'Sweden',
        contactChannels: [
          ...c.emails.map((e) => ({ type: 'Email', value: e.value })),
          ...c.phoneNumbers.map((e) => ({ type: 'Phone', value: trimPhoneNumber(e.value) })),
        ],
        ...(c.loginName && { parameters: [{ key: 'username', values: [c.loginName], displayName: 'Användarnamn' }] }),
        metadata: c.metadata,
      });
    }
  });
  return stakeholders;
};