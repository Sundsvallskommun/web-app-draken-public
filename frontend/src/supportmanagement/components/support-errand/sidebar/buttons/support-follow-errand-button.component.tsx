import { Button, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import {
  findErrandSubscription,
  followErrand,
  getMySubscriptions,
  unfollowErrand,
} from '@supportmanagement/services/support-subscription-service';
import { Bell, BellOff } from 'lucide-react';
import { FC, useEffect, useState } from 'react';

/**
 * Turn notifications for this errand on or off.
 *
 * Support Management subscribes the handler to an errand when it is assigned to them; everything
 * else the user wants to hear about, they follow here. The button also shows that state, and lets the
 * handler stop following an errand they were subscribed to by being assigned it.
 */
export const SupportFollowErrandButtonComponent: FC = () => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const subscriptions = useSupportStore((s) => s.subscriptions);
  const setSubscriptions = useSupportStore((s) => s.setSubscriptions);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useSnackbar();

  useEffect(() => {
    if (!municipalityId) return;
    getMySubscriptions(municipalityId)
      .then(setSubscriptions)
      .catch(() => {
        // A missing subscription list only means the toggle shows "not following"; it is not worth
        // interrupting the user over.
      });
  }, [municipalityId, setSubscriptions]);

  const subscription = supportErrand?.id ? findErrandSubscription(subscriptions, supportErrand.id) : undefined;
  const isFollowing = !!subscription;

  const handleToggle = async () => {
    if (!supportErrand?.id) return;
    setIsLoading(true);
    try {
      if (subscription?.id) {
        await unfollowErrand(municipalityId, subscription.id);
        toast({ position: 'bottom', closeable: true, message: 'Du följer inte längre ärendet', status: 'success' });
      } else {
        await followErrand(municipalityId, supportErrand.id);
        toast({ position: 'bottom', closeable: true, message: 'Du följer nu ärendet', status: 'success' });
      }
      setSubscriptions(await getMySubscriptions(municipalityId));
    } catch (error) {
      toast({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när prenumerationen skulle ändras',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="w-full"
      variant="secondary"
      data-cy="follow-errand-toggle"
      aria-pressed={isFollowing}
      disabled={!supportErrand?.id || isLoading}
      loading={isLoading}
      leftIcon={isFollowing ? <BellOff size="1.8rem" /> : <Bell size="1.8rem" />}
      onClick={handleToggle}
    >
      {isFollowing ? 'Sluta följa ärendet' : 'Följ ärendet'}
    </Button>
  );
};
