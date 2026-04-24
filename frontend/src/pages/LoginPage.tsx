import EmptyLayout from '@common/components/empty-layout/empty-layout.component';
import LoaderFullScreen from '@common/components/loader/loader-fullscreen';
import { apiURL } from '@common/utils/api-url';
import { appURL } from '@common/utils/app-url';
import { appConfig } from '@config/appconfig';
import { Button, FormErrorMessage } from '@sk-web-gui/react';
import { FC, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { capitalize } from 'underscore.string';

const autoLogin = false;

const Login: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  const isLoggedOut = searchParams?.get('loggedout') === '';
  const failMessage = searchParams?.get('failMessage');

  const initalFocus = useRef<HTMLButtonElement>(null);
  const setInitalFocus = () => {
    setTimeout(() => {
      initalFocus?.current?.focus();
    });
  };

  const onLogin = () => {
    const searchPath = searchParams?.get('path');
    const nonLoginPath = !location.pathname?.match(/\/login/) && location.pathname;
    const nonLoginSearch = !searchPath?.match(/\/login|\/logout/) && searchPath;
    const path = nonLoginPath || nonLoginSearch || '/';

    const basePath = import.meta.env.VITE_BASEPATH || '';
    const cleanedPath = path.startsWith(basePath) ? path.slice(basePath.length) : path;

    const url = new URL(apiURL('/saml/login'));
    const queries = new URLSearchParams({
      successRedirect: `${appURL(cleanedPath)}`,
      failureRedirect: `${appURL()}/login`,
    });
    url.search = queries.toString();

    window.location.href = url.toString();
  };

  useEffect(() => {
    setInitalFocus();

    if (isLoggedOut) {
      navigate('/login', { replace: true });
      setIsLoading(false);
    } else {
      if (failMessage === 'NOT_AUTHORIZED' && autoLogin) {
        onLogin();
      } else if (failMessage === 'NOT_AUTHORIZED') {
        setIsLoading(false);
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

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
