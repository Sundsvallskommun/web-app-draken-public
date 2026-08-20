import { UploadFile } from '@sk-web-gui/react';
import { Attachment } from 'src/data-contracts/backend/data-contracts';

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
  if (!attachment?.id) {
    throw new Error('Attachment must have an id to be mapped to UploadFile');
  }
  // Attachment content is fetched separately, so the metadata alone maps to an empty File.
  // Callers that have fetched the content replace this with base64ToFile.
  const file = new File([], `${attachment.name}`, {
    type: attachment.mimeType,
  });

  const a: UploadFile<TExtraMeta> = {
    id: attachment.id.toString(),
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
      channel: attachment.channel,
      decisionId: attachment.decisionId,
      ...((attachment.extraParameters ?? {}) as TExtraMeta),
      isValidAttachment: validAttachment(attachment),
    },
  };
  return a;
}

export function validAttachment(attachment: Attachment): boolean {
  return !!attachment.hash;
}
