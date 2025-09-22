import {
  Attachment,
  MEXAllAttachmentLabels,
  MEXAttachmentCategory,
  MEXAttachmentLabels,
  MEXLegacyAttachmentLabels,
  PTAttachmentCategory,
  PTAttachmentLabels,
} from '@casedata/interfaces/attachment';
import { PTCaseType } from '@casedata/interfaces/case-type';
import { IErrand } from '@casedata/interfaces/errand';
import { imageMimeTypes } from '@common/components/file-upload/file-upload.component';
import { ApiResponse, apiService } from '@common/services/api-service';
import { isMEX, isPT } from '@common/services/application-service';
import { UploadFile } from '@sk-web-gui/react';

export const MAX_FILE_SIZE_MB = 50;

export const documentMimeTypes = [
  'application/pdf',
  'application/rtf',
  'application/msword',
  'application/x-tika-msoffice',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.ms-outlook',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

export const ACCEPTED_UPLOAD_FILETYPES = [
  'bmp',
  'gif',
  'tif',
  'tiff',
  'jpeg',
  'jpg',
  'png',
  'htm',
  'html',
  'pdf',
  'rtf',
  'docx',
  'doc',
  'txt',
  'xlsx',
  'xls',
  'pptx',
  'odt',
  'ods',
  'text/html',
  'msg',
  'heic',
  'heif',
  ...imageMimeTypes,
  ...documentMimeTypes,
];

export const getMEXAttachmentKey = (
  label: string
): keyof typeof MEXAttachmentLabels | keyof typeof MEXLegacyAttachmentLabels | undefined => {
  const labelToKeyMap: Record<string, keyof typeof MEXAllAttachmentLabels> = Object.entries(
    MEXAllAttachmentLabels
  ).reduce((acc, [key, value]) => {
    acc[value] = key as keyof typeof MEXAllAttachmentLabels;
    return acc;
  }, {} as Record<string, keyof typeof MEXAllAttachmentLabels>);

  return labelToKeyMap[label];
};

export const getPTAttachmentKey: (label: string) => PTAttachmentCategory = (label) => {
  switch (label) {
    case 'Passfoto':
      return 'PASSPORT_PHOTO';
    case 'Läkarintyg':
      return 'MEDICAL_CONFIRMATION';
    case 'Underskrift':
      return 'SIGNATURE';
    case 'Polisanmälan':
      return 'POLICE_REPORT';
    case 'Ärende (Skannad ansökan)':
      return 'ERRAND_SCANNED_APPLICATION';
    case 'Delgivningskvitto':
      return 'SERVICE_RECEIPT';
    case 'Övriga bilagor':
      return 'OTHER_ATTACHMENT';
    default:
      return undefined;
  }
};

export const getAttachmentLabel = (attachment: Attachment) =>
  isMEX() ? MEXAttachmentLabels[attachment?.category] || 'Okänt' : PTAttachmentLabels[attachment?.category] || 'Okänt';

export const getImageAspect: (attachment: Attachment) => number = (attachment) =>
  attachment?.category === 'PASSPORT_PHOTO'
    ? 3 / 4
    : attachment?.category === 'MEDICAL_CONFIRMATION'
    ? undefined
    : attachment?.category === 'SIGNATURE'
    ? 4 / 1
    : attachment?.category === 'POLICE_REPORT'
    ? undefined
    : attachment?.category === 'UNKNOWN'
    ? undefined
    : undefined;

const uniqueAttachments: MEXAttachmentCategory[] = [];
const uniquePTAttachments: PTAttachmentCategory[] = ['PASSPORT_PHOTO', 'SIGNATURE'];

export const onlyOneAllowed: (cat: MEXAttachmentCategory | PTAttachmentCategory) => boolean = (
  cat: MEXAttachmentCategory & PTAttachmentCategory
) => (isMEX() ? uniqueAttachments.includes(cat) : uniquePTAttachments.includes(cat));

export const validateAttachmentsForUtredning: (errand: IErrand) => boolean = (errand) => {
  // Errand may only have max one passport photo and max one signature before moving to Utredning phase
  const uniqueAttachmentsOnlyOnce = uniqueAttachments.every(
    (u) =>
      errand.attachments.filter(
        (a) => (isMEX() ? (a.category as MEXAttachmentCategory) : (a.category as PTAttachmentCategory)) === u
      ).length < 2
  );
  return uniqueAttachmentsOnlyOnce;
};

export const validateAttachmentsForDecision: (errand: IErrand) => { valid: boolean; reason: string } = (errand) => {
  if (isPT()) {
    const uniqueAttachmentsOnlyOnce = validateAttachmentsForUtredning(errand);
    const passportPhotoMissing =
      errand.caseType === PTCaseType.PARKING_PERMIT &&
      errand.attachments.filter((a) => (a.category as PTAttachmentCategory) === 'PASSPORT_PHOTO').length === 0;
    const tooManypassportPhotos =
      errand.attachments.filter((a) => (a.category as PTAttachmentCategory) === 'PASSPORT_PHOTO').length > 1;
    const medicalConfirmationValid =
      errand.extraParameters.find((p) => p.key === 'application.renewal.medicalConfirmationRequired')?.values[0] ===
        'no' ||
      errand.attachments.filter((a) => (a.category as PTAttachmentCategory) === 'MEDICAL_CONFIRMATION').length > 0 ||
      errand.caseType !== PTCaseType.PARKING_PERMIT;
    const signatureValid =
      errand.attachments.filter((a) => (a.category as PTAttachmentCategory) === 'SIGNATURE').length ==
      (errand.extraParameters.find((p) => p.key === 'application.applicant.signingAbility')?.values[0] === 'true'
        ? 1
        : 0);
    const rsn = [];
    if (passportPhotoMissing) {
      rsn.push('passfoto saknas');
    }
    if (tooManypassportPhotos) {
      rsn.push('endast ett passfoto får bifogas');
    }
    if (!medicalConfirmationValid) {
      rsn.push('läkarintyg saknas');
    }
    if (!signatureValid) {
      rsn.push('signaturfoto måste bifogas om den sökande kan signera');
    }

    const reason = rsn.map((r, i) => {
      if (i === 0) {
        return r.charAt(0).toUpperCase() + r.slice(1);
      }
      return r;
    });

    return {
      valid:
        uniqueAttachmentsOnlyOnce &&
        !passportPhotoMissing &&
        !tooManypassportPhotos &&
        medicalConfirmationValid &&
        signatureValid,
      reason: reason.join(', '),
    };
  }

  return {
    valid: true,
    reason: '',
  };
};

export const withRetries: <T>(retries: number, func: () => Promise<T>) => Promise<T | boolean> = (retries, func) => {
  return func().catch((e) => {
    if (retries > 0) {
      return withRetries(retries - 1, func);
    } else {
      console.error('Out of retries, throwing original exception');
      throw e;
    }
  });
};

export const editAttachment = (
  municipalityId: string,
  errandId: string,
  attachmentId: string,
  attachmentName: string,
  attachmentType: string
) => {
  const obj: Partial<Attachment> = {
    name: attachmentName,
    category: attachmentType,
  };
  return apiService
    .patch<boolean, Partial<Attachment>>(
      `casedata/${municipalityId}/errands/${errandId}/attachments/${attachmentId}`,
      obj
    )
    .then((res) => {
      return res;
    })
    .catch((e) => {
      console.error('Something went wrong when creating attachment ', obj.category);
      throw e;
    });
};

export const sendAttachments = (
  municipalityId: string,
  errandId: number,
  errandNumber: string,
  attachmentData: UploadFile[]
) => {
  const attachmentPromises = attachmentData.map(async (attachment) => {
    const fileItem = attachment.file;

    if (!fileItem) {
      throw new Error('FILE_MISSING');
    }

    if (fileItem.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
      throw new Error('MAX_SIZE');
    }

    if (!attachment.meta?.category) {
      throw new Error('TYPE_MISSING');
    }

    const extension = fileItem.name.split('.').pop();

    const obj: Attachment = {
      category: attachment.meta.category,
      name: `${fileItem.name}`,
      note: '',
      extension,
      mimeType: extension === 'msg' ? 'application/vnd.ms-outlook' : fileItem.type,
      file: '',
    };

    const attachmentName = attachment.meta.name + '.' + attachment.meta.ending;

    const formData = new FormData();
    formData.append('files', fileItem, fileItem.name);
    formData.append('category', obj.category);
    formData.append('name', attachmentName);
    formData.append('note', obj.note);
    formData.append('extension', obj.extension || '');
    formData.append('mimeType', obj.mimeType);
    formData.append('errandNumber', errandNumber);

    const postAttachment = () =>
      apiService
        .post<boolean, FormData>(`casedata/${municipalityId}/errands/${errandId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((res) => res)
        .catch((e) => {
          console.error('Something went wrong when creating attachment ', obj.category);
          throw e;
        });

    return withRetries(3, postAttachment);
  });

  return Promise.all(attachmentPromises).then(() => true);
};

export const deleteAttachment = (municipalityId: string, errandId: number, attachment: UploadFile) => {
  if (!attachment.id) {
    console.error('No id found, cannot continue.');
    return;
  }
  const attachmentId = attachment.id;

  return apiService
    .deleteRequest<boolean>(`casedata/${municipalityId}/errands/${errandId}/attachments/${attachmentId}`)
    .then((res) => {
      return res;
    })
    .catch((e) => {
      console.error('Something went wrong when removing attachment ', attachmentId);
      throw e;
    });
};

export const fetchAttachment: (
  municipalityId: string,
  errandId: number,
  attachmentId: string
) => Promise<ApiResponse<Attachment>> = (municipalityId, errandId, attachmentId) => {
  if (!attachmentId) {
    console.error('No attachment id found, cannot fetch. Returning.');
  }

  const url = `casedata/${municipalityId}/errands/${errandId}/attachments/${attachmentId}`;
  return apiService
    .get<ApiResponse<Attachment>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching attachment: ', attachmentId);
      throw e;
    });
};

export const fetchErrandAttachments: (
  municipalityId: string,
  errandId: number
) => Promise<ApiResponse<Attachment[]>> = (municipalityId, errandId) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }
  const url = `casedata/${municipalityId}/errand/${errandId}/attachments`;
  return apiService
    .get<ApiResponse<Attachment[]>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching attachments for errand: ', errandId);
      return { data: [], message: 'error' };
    });
};

export const messageAttachment: (
  municipalityId: string,
  errandId: number,
  messageId: string,
  attachmentId: string
) => Promise<ApiResponse<Attachment[]>> = (municipalityId, errandId, messageId, attachmentId) => {
  if (!errandId) {
    console.error('No errand id found, cannot fetch. Returning.');
  }
  if (!attachmentId) {
    console.error('No attachment id found, cannot fetch. Returning.');
  }

  const url = `casedata/${municipalityId}/errand/${errandId}/messages/${messageId}/attachments/${attachmentId}`;
  return apiService
    .get<any>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching attachment');
      return { data: [], message: 'error' };
    });
};
