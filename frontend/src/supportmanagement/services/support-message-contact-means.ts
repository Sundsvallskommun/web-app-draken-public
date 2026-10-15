import type { MessageContactMeans } from '@common/services/message-template-body-service';

/** The e-service answers the message form offers for an errand, as the errand's channel decides them. */
export interface SupportEserviceContactMeansOffer {
  /** The internal e-service's web message, for an errand that came in over it. */
  readonly internalWebmessage: boolean;
  /** The external e-service's web message, offered where that e-service answers by web message. */
  readonly externalWebmessage: boolean;
  /** Katla's conversation on the errand, for an errand that came in over an e-service. */
  readonly katla: boolean;
}

/**
 * The contact means a new message starts on. An errand that came in over an e-service is answered there:
 * by web message where the form offers one, otherwise through Katla. Anything else starts on e-mail.
 */
export const defaultSupportContactMeans = (offer: SupportEserviceContactMeansOffer): MessageContactMeans => {
  if (offer.internalWebmessage || offer.externalWebmessage) return 'webmessage';
  if (offer.katla) return 'katla';
  return 'email';
};
