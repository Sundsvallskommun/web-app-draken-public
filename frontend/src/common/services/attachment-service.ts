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
  if (!attachment.file) {
    throw new Error(`Attachment "${attachment.name}" saknar base64-innehåll och kan inte konverteras till File`);
  }

  const file = base64ToFile(attachment.file, `${attachment.name}`, attachment.mimeType);

  return {
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
    },
  };
}
