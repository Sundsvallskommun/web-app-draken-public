import {
  NotificationChannel,
  Subscriber,
  Subscription,
  SubscriptionTargetTypeEnum,
} from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

/** The user's own subscriber: who is notified, and on which channels. The backend creates it on first use. */
export const getMySubscriber = (municipalityId: string): Promise<Subscriber> =>
  apiService.get<Subscriber>(`supportsubscribers/${municipalityId}/me`).then((res) => res.data);

/**
 * Stores the channels the user is notified on. The backend also exposes event filters and pausing on the same
 * route; nothing offers those yet.
 */
export const updateMyNotificationChannels = (
  municipalityId: string,
  channels: NotificationChannel[]
): Promise<Subscriber> =>
  apiService
    .patch<Subscriber, { channels: NotificationChannel[] }>(`supportsubscribers/${municipalityId}/me`, { channels })
    .then((res) => res.data);

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
