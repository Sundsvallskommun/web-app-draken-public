import { Subscription, SubscriptionTargetTypeEnum } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

// The backend also exposes GET/PATCH /supportsubscribers/:municipalityId/me for reading and changing
// notification settings (channels, event filters, pausing). No UI consumes that yet, so no client
// wrapper is kept here — adding one is the first step when the settings view is built.

export const getMySubscriptions: (municipalityId: string) => Promise<Subscription[]> = (municipalityId) => {
  return (
    apiService
      .get<Subscription[]>(`supportsubscriptions/${municipalityId}`)
      // Only a list is a list of subscriptions: anything else would break every consumer that searches it.
      .then((res) => (Array.isArray(res.data) ? res.data : []))
      .catch((e) => {
        console.error('Something went wrong when fetching subscriptions');
        throw e;
      })
  );
};

export const followErrand: (municipalityId: string, errandId: string) => Promise<Subscription> = (
  municipalityId,
  errandId
) => {
  return apiService
    .post<Subscription, { target: { type: SubscriptionTargetTypeEnum; id: string } }>(
      `supportsubscriptions/${municipalityId}`,
      { target: { type: SubscriptionTargetTypeEnum.ERRAND, id: errandId } }
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when subscribing to errand');
      throw e;
    });
};

export const unfollowErrand: (municipalityId: string, subscriptionId: string) => Promise<void> = (
  municipalityId,
  subscriptionId
) => {
  return apiService
    .deleteRequest<void>(`supportsubscriptions/${municipalityId}/${subscriptionId}`)
    .then(() => undefined)
    .catch((e) => {
      console.error('Something went wrong when unsubscribing from errand');
      throw e;
    });
};

/** Find the user's subscription for an errand, if they have one. */
export const findErrandSubscription = (subscriptions: Subscription[], errandId: string): Subscription | undefined =>
  subscriptions.find(
    (subscription) =>
      subscription.target?.type === SubscriptionTargetTypeEnum.ERRAND && subscription.target?.id === errandId
  );
