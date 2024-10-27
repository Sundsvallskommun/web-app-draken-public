import { getMe } from '@common/services/user-service';
import { useEffect, useState } from 'react';
import { useAppContext } from '@common/contexts/app.context';
import { useRouter } from 'next/router';
import { Spinner } from '@sk-web-gui/react';

export const LoginGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, setUser } = useAppContext();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getMe()
      .then(setUser)
      .catch((message) => {
        router.push(
          {
            pathname: '/login',
            query: {
              failMessage: message,
            },
          },
          '/login'
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted || (!user.name && router.pathname !== '/login')) {
    return (
      <main>
        <div className="w-screen h-screen flex place-items-center place-content-center">
          <Spinner size={24} aria-label="Laddar information" />
        </div>
      </main>
    );
  }

  return <>{children}</>;
};

export default LoginGuard;
