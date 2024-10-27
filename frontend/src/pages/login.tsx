import { getApplicationName, isKC, isPT, isMEX, isLOP, isIS } from '@common/services/application-service';
import { Button, FormErrorMessage } from '@sk-web-gui/react';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import EmptyLayout from '../common/components/empty-layout/empty-layout.component';

export default function Start() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();

  const initalFocus = useRef(null);
  const setInitalFocus = () => {
    setTimeout(() => {
      initalFocus.current && initalFocus.current.focus();
    });
  };

  const onLogin = () => {
    // NOTE: send user to login with SSO
    router.push(`${process.env.NEXT_PUBLIC_API_URL}/saml/login`);
  };

  useEffect(() => {
    setInitalFocus();
    if (router.query?.failMessage === 'SAML_MISSING_GROUP') {
      setMessage('Användaren saknar rätt grupper');
    } else if (router.query?.failMessage === 'SAML_MISSING_ATTRIBUTES') {
      setMessage('Användaren saknar attribut');
    } else if (router.query?.failMessage === 'Missing profile attributes') {
      setMessage('Användaren saknar rätt attribut');
    }
  }, [router]);

  return (
    <>
      <EmptyLayout title={`${getApplicationName()} - Logga In`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-5xl w-full flex flex-col bg-background-content p-20 shadow-lg text-left">
            <div className="text-center">
              <h3 className="mb-20">
                Logga in till <br aria-hidden />
                {isPT()
                  ? 'Mina externa ärenden'
                  : isKC() || isIS() || isLOP() || isMEX()
                  ? getApplicationName()
                  : 'appen'}
              </h3>
              {message && (
                <FormErrorMessage>
                  <p className="mb-20">Det gick inte att logga in. {message}</p>
                </FormErrorMessage>
              )}
            </div>

            <Button color="vattjom" onClick={() => onLogin()} ref={initalFocus} data-cy="loginButton">
              Logga in
            </Button>
          </div>
        </div>
      </EmptyLayout>
    </>
  );
}
