import { Attachment } from '@casedata/interfaces/attachment';
import { UploadFile } from '@sk-web-gui/react';

export function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  const byteString = atob(base64);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new File([uint8Array], fileName, { type: mimeType });
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
