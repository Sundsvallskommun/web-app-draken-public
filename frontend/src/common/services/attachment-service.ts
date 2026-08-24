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

/**
 * Turns base64 attachment content into a browser download. Shared by the surfaces that fetch
 * attachment content on demand rather than receiving it with the metadata.
 *
 * Throws on empty content instead of delegating to base64ToFile, which swallows a failed decode
 * into an empty File - that would save a 0-byte file and look like a successful download.
 */
export function downloadBase64File(base64: string, fileName: string, mimeType: string): void {
  if (!base64) {
    throw new Error('EMPTY_ATTACHMENT_CONTENT');
  }
  const blobUrl = URL.createObjectURL(base64ToFile(base64, fileName, mimeType));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
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
