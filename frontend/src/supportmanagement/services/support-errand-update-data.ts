import type { Label, Stakeholder as SupportStakeholder } from '@common/data-contracts/supportmanagement/data-contracts';
import type { RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { getSupportErrandClassificationPlacement } from '@supportmanagement/investigation/investigation-classification-ownership';
import type { SupportErrandDto } from 'src/data-contracts/backend/data-contracts';

export const buildSupportErrandUpdateData = (
  formdata: Partial<RegisterSupportErrandFormModel>,
  stakeholders: SupportStakeholder[]
): Partial<SupportErrandDto> => {
  const basicsOwnsClassification = getSupportErrandClassificationPlacement().owner === 'basics';
  const data: Partial<SupportErrandDto> = {
    ...(formdata.title && { title: formdata.title }),
    ...(formdata.priority && {
      priority: formdata.priority,
    }),
    ...(basicsOwnsClassification &&
      formdata.category &&
      formdata.type && {
        classification: {
          category: formdata.category,
          type: formdata.type,
        },
      }),
    ...(basicsOwnsClassification && {
      labels: (formdata.labels ?? []).map((label): Label => ({ ...label, labels: undefined })),
    }),
    ...(formdata.contactReason && { contactReason: formdata.contactReason }),
    ...(typeof formdata.contactReasonDescription !== 'undefined' && {
      contactReasonDescription: formdata.contactReasonDescription,
    }),
    businessRelated: !!formdata.businessRelated,
    ...(formdata.escalationEmail && { escalationEmail: formdata.escalationEmail }),
    ...(formdata.channel && { channel: formdata.channel }),
    ...(formdata.description && { description: formdata.description }),
    stakeholders,
    externalTags: (formdata.externalTags || []).filter((tag) => tag.key !== 'caseId'),
    parameters: formdata.parameters || [],
  };
  if (formdata.caseId) {
    data.externalTags!.push({
      key: 'caseId',
      value: formdata.caseId,
    });
  }
  return data;
};
