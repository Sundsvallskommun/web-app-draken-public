import { Subscription, SubscriptionTargetTypeEnum } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

// The backend also exposes GET/PATCH /supportsubscribers/:municipalityId/me for reading and changing
// notification settings (channels, event filters, pausing). No UI consumes that yet, so no client
// wrapper is kept here — adding one is the first step when the settings view is built.

export const getMySubscriptions: (municipalityId: string) => Promise<Subscription[]> = (municipalityId) => {
  return apiService
    .get<Subscription[]>(`supportsubscriptions/${municipalityId}`)
    .then((res) => res.data ?? [])
    .catch((e) => {
      console.error('Something went wrong when fetching subscriptions');
      throw e;
    });
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

/**
 * Subscribe the current user to an errand because they just acted on it.
 *
 * This is how users get notifications without configuring anything: taking an errand, replying,
 * commenting or saving is taken as "I care about this one". The backend makes the call idempotent,
 * so this can be fired after any such action without checking first.
 *
 * Deliberately swallows its errors. It is a side effect of the user's actual action — failing to
 * subscribe must never make a successful reply look like it failed.
 */
export const ensureErrandSubscription = async (municipalityId: string, errandId?: string): Promise<void> => {
  if (!municipalityId || !errandId) return;
  try {
    await followErrand(municipalityId, errandId);
  } catch (e) {
    console.error('Could not create implicit subscription for errand', errandId);
  }
};
