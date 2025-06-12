import { useRouter } from 'next/navigation';
import React, { useEffect, Fragment, useRef } from 'react';

function WarnIfUnsavedChanges({ children, showWarning }: { children: React.ReactNode; showWarning: boolean }) {
  const router = useRouter();
  const warningText = 'Du har osparade ändringar. Är du säker på att du vill lämna den här sidan?';
  const shouldWarn = useRef(showWarning);

  useEffect(() => {
    shouldWarn.current = showWarning;
  }, [showWarning]);

  useEffect(() => {
    const handleWindowClose = (e: BeforeUnloadEvent) => {
      if (!shouldWarn.current) return;
      e.preventDefault();
      e.returnValue = warningText;
      return warningText;
    };
    window.addEventListener('beforeunload', handleWindowClose);
    return () => window.removeEventListener('beforeunload', handleWindowClose);
  }, []);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (!shouldWarn.current || url === '/login') return;
      if (!window.confirm(warningText)) {
        throw 'Abort route change. User cancelled navigation.';
      }
    };
    const originalPush = router.push;
    const originalReplace = router.replace;

    router.push = async (...args: any[]) => {
      handleRouteChange(args[0]);
      return originalPush.apply(router, args);
    };
    router.replace = async (...args: any[]) => {
      handleRouteChange(args[0]);
      return originalReplace.apply(router, args);
    };

    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [router]);

  return <Fragment>{children}</Fragment>;
}

export default WarnIfUnsavedChanges;
