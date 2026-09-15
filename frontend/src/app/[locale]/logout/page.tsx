'use client';

import { appURL } from '@common/utils/app-url';
import { appConfig } from '@config/appconfig';
import { FC, useEffect } from 'react';
const Logout: FC = () => {
  useEffect(() => {
    localStorage.clear();
    sessionStorage.clear();

    const query = new URLSearchParams({
      successRedirect: `${appURL()}/login?loggedout`,
    });

    window.location.assign(
      `${process.env.NEXT_PUBLIC_API_URL}${
        appConfig.isOidcEnabled ? '/oidc/logout' : '/saml/logout'
      }?${query.toString()}`
    );
  }, []);

  return <></>;
};

export default Logout;
