'use client';

import { appConfig } from '@config/appconfig';

import EmptyLayout from '@common/components/empty-layout/empty-layout.component';
import { Button, FormErrorMessage } from '@sk-web-gui/react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function LoginView() {
  const router = useRouter();
  const params = useParams();
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
    if (params?.failMessage === 'SAML_MISSING_GROUP') {
      setMessage('Användaren saknar rätt grupper');
    } else if (params?.failMessage === 'SAML_MISSING_ATTRIBUTES') {
      setMessage('Användaren saknar attribut');
    } else if (params?.failMessage === 'Missing profile attributes') {
      setMessage('Användaren saknar rätt attribut');
    }
  }, [params]);

  return (
    <>
      <EmptyLayout title={`${appConfig.applicationName} - Logga In`}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-5xl w-full flex flex-col bg-background-content p-20 shadow-lg text-left">
            <div className="text-center">
              <h3 className="mb-20">
                Logga in till <br aria-hidden />
                {appConfig.applicationName}
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
