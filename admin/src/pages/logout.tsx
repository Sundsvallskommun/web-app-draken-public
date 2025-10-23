import { useUserStore } from '@services/user-service/user-service';
import { apiURL } from '@utils/api-url';
import { appURL } from '@utils/app-url';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function Logout() {
  const router = useRouter();

  const resetUser = useUserStore(useShallow((s) => s.reset));

  useEffect(() => {
    resetUser();
    localStorage.clear();
    router.push({
      pathname: apiURL('/saml/logout'),
      query: {
        successRedirect: `${appURL()}/login?loggedout`,
      },
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <></>;
}
