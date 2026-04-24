import { Fragment, ReactNode, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

function WarnIfUnsavedChanges({ children, showWarning }: { children: ReactNode; showWarning: boolean }) {
  const warningText = 'Du har osparade ändringar. Är du säker på att du vill lämna den här sidan?';
  const shouldWarn = useRef(showWarning);

  useEffect(() => {
    shouldWarn.current = showWarning;
  }, [showWarning]);

  useBlocker(({ currentLocation, nextLocation }) => {
    if (!shouldWarn.current) return false;
    if (nextLocation.pathname === '/login') return false;
    if (currentLocation.pathname === nextLocation.pathname) return false;
    return !window.confirm(warningText);
  });

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

  return <Fragment>{children}</Fragment>;
}

export default WarnIfUnsavedChanges;
