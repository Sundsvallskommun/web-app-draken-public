import { Label, Stakeholder as SupportStakeholder } from '@common/data-contracts/supportmanagement/data-contracts';
import { RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { investigationOwnsSupportErrandClassification } from '@supportmanagement/investigation/investigation-classification-ownership';
import { SupportErrandDto } from 'src/data-contracts/backend/data-contracts';

export const buildSupportErrandUpdateData = (
  formdata: Partial<RegisterSupportErrandFormModel>,
  stakeholders: SupportStakeholder[]
): Partial<SupportErrandDto> => {
  const investigationOwnsClassification = investigationOwnsSupportErrandClassification();
  const data: Partial<SupportErrandDto> = {
    ...(formdata.title && { title: formdata.title }),
    ...(formdata.priority && {
      priority: formdata.priority,
    }),
    ...(!investigationOwnsClassification &&
      formdata.category &&
      formdata.type && {
        classification: {
          category: formdata.category,
          type: formdata.type,
        },
      }),
    ...(!investigationOwnsClassification && {
      labels: (formdata.labels ?? []).map((label): Label => ({ ...label, labels: undefined })),
    }),
    ...(formdata.contactReason && { contactReason: formdata.contactReason }),
    ...(typeof formdata.contactReasonDescription !== 'undefined' && {
      contactReasonDescription: formdata.contactReasonDescription,
    }),
    businessRelated: !!formdata.businessRelated,
    ...(formdata.status && { status: formdata.status }),
    ...(formdata.status && {
      suspension: {
        suspendedFrom: undefined,
        suspendedTo: undefined,
      },
    }),
    ...(formdata.resolution && { resolution: formdata.resolution }),
    ...(formdata.escalationEmail && { escalationEmail: formdata.escalationEmail }),
    ...(formdata.channel && { channel: formdata.channel }),
    ...(formdata.description && { description: formdata.description }),
    ...(formdata.assignedUserId && { assignedUserId: formdata.assignedUserId }),
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
