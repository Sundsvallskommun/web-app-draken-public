/**
 * Maps the backend attachment channel value (shared by both the case-data and
 * support-management APIs — see AttachmentChannelEnum / ErrandAttachmentChannelEnum
 * in the backend data-contracts) to a Swedish display label shown in the UI.
 */
export enum AttachmentChannelLabels {
  EMAIL = 'E-post',
  ESERVICE = 'E-tjänst',
  WEB_UI = 'Draken',
  MY_PAGES = 'Mina sidor',
}

const UNKNOWN_ATTACHMENT_CHANNEL_LABEL = 'Okänd';

/**
 * Returns the Swedish display label for an attachment channel value. Falls back
 * to "Okänd" when the channel is missing or not a known value.
 */
export const getAttachmentChannelLabel = (channel?: string): string => {
  if (!channel) {
    return UNKNOWN_ATTACHMENT_CHANNEL_LABEL;
  }
  return AttachmentChannelLabels[channel as keyof typeof AttachmentChannelLabels] ?? UNKNOWN_ATTACHMENT_CHANNEL_LABEL;
};
