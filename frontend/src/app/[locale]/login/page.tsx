'use client';

import EmptyLayout from '@common/components/empty-layout/empty-layout.component';
import LoaderFullScreen from '@common/components/loader/loader-fullscreen';
import { apiURL } from '@common/utils/api-url';
import { appURL } from '@common/utils/app-url';
import { appConfig } from '@config/appconfig';
import { Button, FormErrorMessage } from '@sk-web-gui/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { capitalize } from 'underscore.string';

// Turn on/off automatic login
const autoLogin = false;

const Login: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathName = usePathname();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  const isLoggedOut = searchParams.get('loggedout') === '';
  const failMessage = searchParams.get('failMessage');

  const initalFocus = useRef<HTMLButtonElement>(null);
  const setInitalFocus = () => {
    setTimeout(() => {
      initalFocus?.current?.focus();
    });
  };

  const onLogin = () => {
    const searchPath = searchParams.get('path');
    const nonLoginPath = !pathName?.match(/\/login/) && pathName;
    const nonLoginSearch = !searchPath?.match(/\/login|\/logout/) && searchPath;
    const path = nonLoginPath || nonLoginSearch || '/';

    //Basepath problem, lägger till FT/FT vid login. Detta löser buggen men inte en bra lösning.
    const cleanedPath = path.replace(new RegExp(`^${process.env.NEXT_PUBLIC_BASEPATH}`), '');

    const url = new URL(apiURL('/saml/login'));
    const queries = new URLSearchParams({
      successRedirect: `${appURL(cleanedPath)}`,
      failureRedirect: `${appURL()}/login`,
    });
    url.search = queries.toString();

    router.push(url.toString());
  };

  useEffect(() => {
    setInitalFocus();
    console.log('Login useEffect', { isLoggedOut, failMessage, autoLogin });
    if (!router) return;

    if (isLoggedOut) {
      router.push('/login');
      setIsLoading(false);
    } else {
      if (failMessage === 'NOT_AUTHORIZED' && autoLogin) {
        // autologin
        onLogin();
      } else if (failMessage) {
        setErrorMessage(t(`login:errors.${failMessage}`));
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    // to not flash the login-screen on autologin
    return (
      <EmptyLayout>
        <LoaderFullScreen />
      </EmptyLayout>
    );
  }

  return (
    <EmptyLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-5xl w-full flex flex-col bg-background-content p-20 shadow-lg text-left">
          <div className="text-center">
            <h3 className="mb-20">
              Logga in till <br aria-hidden />
              {appConfig.applicationName}
            </h3>
            {errorMessage && (
              <FormErrorMessage className="mt-lg">
                <p className="mb-20">Det gick inte att logga in. {errorMessage}</p>
              </FormErrorMessage>
            )}
          </div>

          <Button color="vattjom" onClick={() => onLogin()} ref={initalFocus} data-cy="loginButton">
            {capitalize(t('common:login'))}
          </Button>
        </div>
      </div>
    </EmptyLayout>
  );
};

function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}

export default LoginPage;
