import {
  MEXAllAttachmentLabels,
  MEXAttachmentCategory,
  MEXAttachmentLabels,
  MEXLegacyAttachmentLabels,
  PTAttachmentCategory,
  PTAttachmentLabels,
  SingleCasedataAttachment,
} from '@casedata/interfaces/attachment';
import { PTCaseType } from '@casedata/interfaces/case-type';
import { IErrand } from '@casedata/interfaces/errand';
import { imageMimeTypes } from '@common/components/file-upload/file-upload.component';
import { ApiResponse, apiService } from '@common/services/api-service';
import { isMEX, isPT } from '@common/services/application-service';
import { base64ToFile, mapAttachmentToUploadFile } from '@common/services/attachment-service';
import { UploadFile } from '@sk-web-gui/react';
import { Attachment } from 'src/data-contracts/backend/data-contracts';

export const MAX_FILE_SIZE_MB = 50;

export const documentMimeTypes = [
  'video/quicktime',
  'video/mp4',
  'video/mpeg',
  'video/x-ms-wmv',
  'video/x-msvideo',
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
  'mov',
  'mp4',
  'mpeg',
  'wmv',
  'avi',
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
  '',
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

export const getPTAttachmentKey: (label: string) => PTAttachmentCategory | undefined = (label) => {
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

export const getAttachmentLabel = (category: string) =>
  isMEX()
    ? (MEXAttachmentLabels as Record<string, string>)[category] || 'Okänt'
    : (PTAttachmentLabels as Record<string, string>)[category] || 'Okänt';

/**
 * Fixed aspect ratios for the PT categories that have a formal format. Returning undefined lets
 * the user crop freely, which is what every other category needs.
 */
export const getImageAspect = (category: string): number | undefined => {
  switch (category) {
    case 'PASSPORT_PHOTO':
      return 3 / 4;
    case 'SIGNATURE':
      return 4 / 1;
    default:
      return undefined;
  }
};

const uniquePTAttachments: PTAttachmentCategory[] = ['PASSPORT_PHOTO', 'SIGNATURE'];

export const onlyOneAllowed: (cat: MEXAttachmentCategory | PTAttachmentCategory) => boolean = (
  cat: MEXAttachmentCategory | PTAttachmentCategory
) => isPT() && uniquePTAttachments.includes(cat as PTAttachmentCategory);

export const validateAttachmentsForUtredning: (errand: IErrand) => boolean = (errand) => {
  if (!isPT()) return true;
  // Errand may only have max one passport photo and max one signature before moving to Utredning phase
  return uniquePTAttachments.every(
    (u) => errand.attachments.filter((a) => (a.category as PTAttachmentCategory) === u).length < 2
  );
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
      errand.extraParameters?.find((p) => p.key === 'application.renewal.medicalConfirmationRequired')?.values?.[0] ===
        'no' ||
      errand.attachments.filter((a) => (a.category as PTAttachmentCategory) === 'MEDICAL_CONFIRMATION').length > 0 ||
      errand.caseType !== PTCaseType.PARKING_PERMIT;
    const signatureValid =
      errand.attachments.filter((a) => (a.category as PTAttachmentCategory) === 'SIGNATURE').length ==
      (errand.extraParameters?.find((p) => p.key === 'application.applicant.signingAbility')?.values?.[0] === 'true'
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
  attachmentData: UploadFile[],
  // Creating an attachment is not idempotent: a response lost after the server committed makes a
  // retry create a second copy. Callers that delete something on success can pass 0 to trade
  // automatic recovery for never producing a silent duplicate.
  retries = 3
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

    const extension = fileItem.name.split('.').pop() ?? '';

    const obj: Attachment = {
      category: attachment.meta.category,
      name: `${attachment.meta.name}.${attachment.meta.ending}`,
      note: (attachment.meta.note as string) ?? '',
      extension,
      mimeType: extension === 'msg' ? 'application/vnd.ms-outlook' : fileItem.type,
    };

    const formData = new FormData();
    formData.append('files', fileItem, fileItem.name);
    formData.append('category', obj.category);
    formData.append('name', obj.name);
    formData.append('note', obj.note ?? '');
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

    return withRetries(retries, postAttachment);
  });

  return Promise.all(attachmentPromises).then(() => true);
};

export const deleteAttachment = (municipalityId: string, errandId: number, attachment: UploadFile) => {
  if (!attachment?.id) {
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

export interface ReplaceAttachmentResult {
  /** False when the replacement was created but the original could not be removed. */
  originalRemoved: boolean;
}

/**
 * CaseData cannot replace the content of an existing attachment: PATCH carries metadata only and
 * the multipart PUT was removed when attachments became binary. The replacement is therefore
 * uploaded as a new attachment and the original deleted afterwards.
 *
 * The order is deliberate. Uploading first means a failed upload leaves the original untouched;
 * deleting first would remove the only copy on the server while the new bytes exist solely in
 * browser memory, so a failed upload would lose the file for good.
 */
export const replaceAttachmentFile = async (
  municipalityId: string,
  errandId: number,
  errandNumber: string,
  attachment: Attachment,
  file: File
): Promise<ReplaceAttachmentResult> => {
  if (!attachment.id) {
    throw new Error('ATTACHMENT_ID_MISSING');
  }
  // Decision attachments live under a separate sub-resource and are part of a legally significant
  // record, so they are never replaced this way.
  if (attachment.decisionId) {
    throw new Error('DECISION_ATTACHMENT_NOT_SUPPORTED');
  }
  if (file.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
    throw new Error('MAX_SIZE');
  }

  // Category, name and note carry over, but the replacement is a new row: it gets a new id and
  // created timestamp, the backend forces channel to WEB_UI, and extraParameters has no field on
  // CreateAttachmentDto. Preserving those needs a content-replacing endpoint upstream.
  const original = mapAttachmentToUploadFile(attachment);
  const replacement: UploadFile = {
    // The id is assigned by the backend when the attachment is created.
    id: '',
    file,
    meta: { ...original.meta, ending: file.name.split('.').pop() ?? original.meta.ending },
  };

  // No retries here. Retrying the upload risks a second copy if the first request committed but
  // its response was lost, and the original is deleted right after, so a silent duplicate would
  // be left behind with nothing to compare against. A visible failure the user can repeat is the
  // safer trade. The cropper keeps the selection, so retrying costs one click.
  await sendAttachments(municipalityId, errandId, errandNumber, [replacement], 0);

  try {
    await deleteAttachment(municipalityId, errandId, original);
    return { originalRemoved: true };
  } catch (e) {
    console.error('Replacement attachment created but the original could not be removed ', attachment.id, e);
    return { originalRemoved: false };
  }
};

export const fetchAttachment: (
  municipalityId: string,
  errandId: number,
  attachment: Attachment
) => Promise<SingleCasedataAttachment> = (municipalityId, errandId, attachment) => {
  if (!attachment.id) {
    return Promise.reject(new Error('No attachment id found, cannot fetch.'));
  }

  const url = `casedata/${municipalityId}/errands/${errandId}/attachments/${attachment.id}`;
  return apiService
    .get<string>(url)
    .then((res) => {
      const att: SingleCasedataAttachment = {
        errandAttachmentHeader: attachment,
        base64EncodedString: res.data,
      };
      return att;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching attachment');
      throw e;
    });
};

// Decision attachments live under a dedicated CaseData sub-resource and are uploaded as binary
// multipart, mirroring sendAttachments. The rendered PDF arrives as base64 and is turned back into
// a File before upload.
export const sendDecisionAttachment = (
  municipalityId: string,
  errandId: number,
  decisionId: number,
  pdfBase64: string,
  name: string,
  errandNumber: string,
  category: string = 'DECISION'
) => {
  const file = base64ToFile(pdfBase64, name, 'application/pdf');

  const formData = new FormData();
  formData.append('files', file, name);
  formData.append('category', category);
  formData.append('name', name);
  formData.append('note', '');
  formData.append('extension', 'pdf');
  formData.append('mimeType', 'application/pdf');
  formData.append('errandNumber', errandNumber);

  const postDecisionAttachment = () =>
    apiService
      .post<boolean, FormData>(
        `casedata/${municipalityId}/errands/${errandId}/decisions/${decisionId}/attachments`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      .then((res) => res)
      .catch((e) => {
        console.error('Something went wrong when creating decision attachment');
        throw e;
      });

  return withRetries(3, postDecisionAttachment);
};

export const fetchDecisionAttachment: (
  municipalityId: string,
  errandId: number,
  decisionId: number,
  attachment: Attachment
) => Promise<SingleCasedataAttachment> = (municipalityId, errandId, decisionId, attachment) => {
  if (!attachment.id) {
    return Promise.reject(new Error('No attachment id found, cannot fetch.'));
  }

  const url = `casedata/${municipalityId}/errands/${errandId}/decisions/${decisionId}/attachments/${attachment.id}`;
  return apiService
    .get<string>(url)
    .then((res) => {
      const att: SingleCasedataAttachment = {
        errandAttachmentHeader: attachment,
        base64EncodedString: res.data,
      };
      return att;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching decision attachment');
      throw e;
    });
};

export const deleteDecisionAttachment = (
  municipalityId: string,
  errandId: number,
  decisionId: number,
  attachmentId: number
) => {
  return apiService
    .deleteRequest<boolean>(
      `casedata/${municipalityId}/errands/${errandId}/decisions/${decisionId}/attachments/${attachmentId}`
    )
    .then((res) => res)
    .catch((e) => {
      console.error('Something went wrong when removing decision attachment ', attachmentId);
      throw e;
    });
};

export const editDecisionAttachment = (
  municipalityId: string,
  errandId: string,
  decisionId: number,
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
      `casedata/${municipalityId}/errands/${errandId}/decisions/${decisionId}/attachments/${attachmentId}`,
      obj
    )
    .then((res) => res)
    .catch((e) => {
      console.error('Something went wrong when editing decision attachment ', obj.category);
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
      return { data: [] as Attachment[], message: 'error' };
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
      return { data: [] as Attachment[], message: 'error' };
    });
};
