import { getMe } from '@common/services/user-service';
import { useEffect, useState } from 'react';
import { useAppContext } from '@common/contexts/app.context';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from '@sk-web-gui/react';

//POSSIBLE UNUSED
export const LoginGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, setUser } = useAppContext();
  const router = useRouter();
  const pathName = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getMe()
      .then(setUser)
      .catch((message) => {
        const params = new URLSearchParams({ failMessage: message });
        router.push(`/login?${params.toString()}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted || (!user.name && pathName !== '/login')) {
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
