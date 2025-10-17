import { Attachment } from '@casedata/interfaces/attachment';
import { UploadFile } from '@sk-web-gui/react';

export function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  try {
    const arr = Buffer.from(base64, 'base64');
    return new File([arr], fileName, { type: mimeType });
  } catch {
    return new File([], fileName, { type: mimeType });
  }
}

export function mapAttachmentToUploadFile<TExtraMeta extends object = object>(
  attachment: Attachment
): UploadFile<TExtraMeta> {
  let file: File;
  if (!attachment.file) {
    file = new File([], `${attachment.name}`, { type: attachment.mimeType });
  } else {
    file = base64ToFile(attachment.file, `${attachment.name}`, attachment.mimeType);
  }

  const a: UploadFile<TExtraMeta> = {
    id: attachment.id?.toString() ?? crypto.randomUUID(),
    file,
    meta: {
      name: attachment.name.replace(/\.[^/.]+$/, ''),
      ending: attachment.extension,
      category: attachment.category,
      note: attachment.note,
      mimeType: attachment.mimeType,
      version: attachment.version,
      created: attachment.created,
      updated: attachment.updated,
      ...((attachment.extraParameters ?? {}) as TExtraMeta),
      isValidAttachment: validAttachment(attachment),
    },
  };
  return a;
}

export function validAttachment(attachment: Attachment): boolean {
  return !!attachment.file;
}