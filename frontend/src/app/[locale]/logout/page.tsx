'use client';

import { appURL } from '@common/utils/app-url';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const Logout: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();

    const query = new URLSearchParams({
      successRedirect: `${appURL()}/login?loggedout`,
    });

    router.push(`${process.env.NEXT_PUBLIC_API_URL}/saml/logout?${query.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <></>;
};

export default Logout;
