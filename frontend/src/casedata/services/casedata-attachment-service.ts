import { Attachment } from '@casedata/interfaces/attachment';
import { PTCaseType } from '@casedata/interfaces/case-type';
import { IErrand } from '@casedata/interfaces/errand';
import { imageMimeTypes } from '@common/components/file-upload/file-upload.component';
import { ApiResponse, apiService } from '@common/services/api-service';
import { isMEX, isPT } from '@common/services/application-service';
import { toBase64 } from '@common/utils/toBase64';

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

export type AttachmentCategory =
  | 'APPLICATION_SQUARE_PLACE'
  | 'OEP_APPLICATION'
  | 'RECEIVED_CONTRACT'
  | 'CONTRACT_DRAFT'
  | 'CORPORATE_TAX_CARD'
  | 'LEASE_REQUEST'
  | 'REQUEST_TO_BUY_SMALL_HOUSE_PLOT'
  | 'INQUIRY_LAND_SALE'
  | 'LAND_PURCHASE_REQUEST'
  | 'RECEIVED_MAP'
  | 'MEX_PROTOCOL'
  | 'ROAD_ALLOWANCE_APPROVAL'
  | 'PREVIOUS_AGREEMENT'
  | 'TERMINATION_OF_HUNTING_RIGHTS'
  | 'OTHER_ATTACHMENT'
  | 'OTHER';

export type PTAttachmentCategory =
  | 'PASSPORT_PHOTO'
  | 'MEDICAL_CONFIRMATION'
  | 'SIGNATURE'
  | 'POLICE_REPORT'
  | 'UNKNOWN'
  | 'ERRAND_SCANNED_APPLICATION'
  | 'SERVICE_RECEIPT'
  | 'OTHER_ATTACHMENT';

export enum AttachmentLabels {
  'APPLICATION_SQUARE_PLACE' = 'Ansökan torgplats',
  'OEP_APPLICATION' = 'Ansökan',
  'RECEIVED_CONTRACT' = 'Avtal inkommit',
  'CONTRACT_DRAFT' = 'Avtalsutkast',
  'CORPORATE_TAX_CARD' = 'F-skattesedel',
  'LEASE_REQUEST' = 'Förfrågan arrende',
  'REQUEST_TO_BUY_SMALL_HOUSE_PLOT' = 'Förfrågan köpa småhustomt',
  'INQUIRY_LAND_SALE' = 'Förfrågan markförsäljning',
  'LAND_PURCHASE_REQUEST' = 'Förfrågan markköp',
  'ROAD_ALLOWANCE_APPROVAL' = 'Godkännande för vägbidrag',
  'RECEIVED_MAP' = 'Karta inkommen',
  'MEX_PROTOCOL' = 'Protokoll',
  'PREVIOUS_AGREEMENT' = 'Tidigare avtal',
  'TERMINATION_OF_HUNTING_RIGHTS' = 'Uppsägning jakträtt',
  'OTHER' = 'Övrigt',
}

export enum PTAttachmentLabels {
  'PASSPORT_PHOTO' = 'Passfoto',
  'MEDICAL_CONFIRMATION' = 'Läkarintyg',
  'SIGNATURE' = 'Underskrift',
  'POLICE_REPORT' = 'Polisanmälan',
  'ERRAND_SCANNED_APPLICATION' = 'Ärende (Skannad ansökan)',
  'SERVICE_RECEIPT' = 'Delgivningskvitto',
  'OTHER_ATTACHMENT' = 'Övriga bilagor',
}

export const getAttachmentKey: (label: string) => AttachmentCategory = (label) => {
  switch (label) {
    case 'Ansökan torgplats':
      return 'APPLICATION_SQUARE_PLACE';
    case 'Ansökan':
      return 'OEP_APPLICATION';
    case 'Avtal inkommit':
      return 'RECEIVED_CONTRACT';
    case 'Avtalsutkast':
      return 'CONTRACT_DRAFT';
    case 'F-skattesedel':
      return 'CORPORATE_TAX_CARD';
    case 'Förfrågan arrende':
      return 'LEASE_REQUEST';
    case 'Förfrågan köpa småhustomt':
      return 'REQUEST_TO_BUY_SMALL_HOUSE_PLOT';
    case 'Förfrågan markförsäljning':
      return 'INQUIRY_LAND_SALE';
    case 'Förfrågan markköp':
      return 'LAND_PURCHASE_REQUEST';
    case 'Godkännande för vägbidrag':
      return 'ROAD_ALLOWANCE_APPROVAL';
    case 'Karta inkommen':
      return 'RECEIVED_MAP';
    case 'Protokoll':
      return 'MEX_PROTOCOL';
    case 'Tidigare avtal':
      return 'PREVIOUS_AGREEMENT';
    case 'Uppsägning jakträtt':
      return 'TERMINATION_OF_HUNTING_RIGHTS';
    case 'Övriga bilagor':
      return 'OTHER_ATTACHMENT';
    case 'Övrigt':
      return 'OTHER';
    default:
      return undefined;
  }
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
  isMEX() ? AttachmentLabels[attachment?.category] || 'Okänt' : PTAttachmentLabels[attachment?.category] || 'Okänt';

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

const uniqueAttachments: AttachmentCategory[] = [];
const uniquePTAttachments: PTAttachmentCategory[] = ['PASSPORT_PHOTO', 'SIGNATURE'];

export const onlyOneAllowed: (cat: AttachmentCategory | PTAttachmentCategory) => boolean = (
  cat: AttachmentCategory & PTAttachmentCategory
) => (isMEX() ? uniqueAttachments.includes(cat) : uniquePTAttachments.includes(cat));

export const validateAttachmentsForUtredning: (errand: IErrand) => boolean = (errand) => {
  // Errand may only have max one passport photo and max one signature before moving to Utredning phase
  const uniqueAttachmentsOnlyOnce = uniqueAttachments.every(
    (u) =>
      errand.attachments.filter(
        (a) => (isMEX() ? (a.category as AttachmentCategory) : (a.category as PTAttachmentCategory)) === u
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
  attachmentData: { type: string; file: FileList; attachmentName: string }[]
) => {
  const attachmentPromises = attachmentData.map(async (attachment, idx) => {
    const fileItem = attachment.file[0];
    if (fileItem.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
      throw new Error('MAX_SIZE');
    }
    if (!attachment.type) {
      throw new Error('TYPE_MISSING');
    }
    const fileData = await toBase64(fileItem);
    const extension = fileItem.name.split('.').pop();
    const obj: Attachment = {
      category: attachment.type,
      name: fileItem.name,
      note: '',
      extension,
      // msg files not handled properly by the browser, so we need to set the mime type manually
      mimeType: extension === 'msg' ? 'application/vnd.ms-outlook' : fileItem.type,
      file: fileData,
    };
    console.log(obj);
    const buf = Buffer.from(obj.file, 'base64');
    const blob = new Blob([buf], { type: obj.mimeType });

    // Building form data
    const formData = new FormData();
    formData.append(`files`, blob, obj.name);
    formData.append(`category`, attachment.type);
    formData.append(`name`, attachment.attachmentName);
    formData.append(`note`, '');
    formData.append(`extension`, obj.extension);
    formData.append(`mimeType`, obj.mimeType);
    formData.append(`errandNumber`, errandNumber);
    console.log('formData', formData);

    const postAttachment = () =>
      apiService
        .post<boolean, FormData>(`casedata/${municipalityId}/errands/${errandId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((res) => {
          return res;
        })
        .catch((e) => {
          console.error('Something went wrong when creating attachment ', obj.category);
          throw e;
        });

    return withRetries(3, postAttachment);
  });

  return Promise.all(attachmentPromises).then((res) => {
    return true;
  });
};

export const deleteAttachment = (municipalityId: string, errandId: number, attachment: Attachment) => {
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
