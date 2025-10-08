import LoaderFullScreen from '@components/loader/loader-fullscreen';
import { useUserStore } from '@services/user-service/user-service';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export const LoginGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const user = useUserStore(useShallow((s) => s.user));
  const getMe = useUserStore(useShallow((s) => s.getMe));

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMe().finally(() => {
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading || (!user.name && !router.pathname.includes('/login'))) {
    return <LoaderFullScreen />;
  }

  // Routes by permissions
  // if (
  //   (router.pathname == '/route-by-permission' && !user.permissions.canEditSystemMessages)
  // ) {
  //   router.push('/');
  //   return <LoaderFullScreen />;
  // }

  return <>{children}</>;
};

export default LoginGuard;
