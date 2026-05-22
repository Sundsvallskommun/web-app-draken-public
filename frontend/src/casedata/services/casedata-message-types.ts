export const CasedataMessageType = {
  Email: 'EMAIL',
  Sms: 'SMS',
  WebMessage: 'WEBMESSAGE',
  WebMessageLegacy: 'WEB_MESSAGE',
  DigitalMail: 'DIGITAL_MAIL',
  Draken: 'DRAKEN',
  MinaSidor: 'MINASIDOR',
} as const;

export type CasedataMessageType = (typeof CasedataMessageType)[keyof typeof CasedataMessageType];

export const isCasedataWebMessageType = (messageType?: string | null): boolean =>
  messageType === CasedataMessageType.WebMessage || messageType === CasedataMessageType.WebMessageLegacy;

export const isCasedataReplyableMessageType = (messageType?: string | null): boolean =>
  messageType === CasedataMessageType.Email ||
  isCasedataWebMessageType(messageType) ||
  messageType === CasedataMessageType.Draken ||
  messageType === CasedataMessageType.MinaSidor;
