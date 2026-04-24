import { Spinner } from '@sk-web-gui/react';
import { lazy, ReactNode, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';


import AppLayout from '@common/components/layout/_app';

import LocalizationProvider from './components/localization-provider';
import ErrorPage from './pages/ErrorPage';
import NotFoundPage from './pages/NotFoundPage';

const OversiktPage = lazy(() => import('./pages/OversiktPage'));
const RegistreraPage = lazy(() => import('./pages/RegistreraPage'));
const ArendePage = lazy(() => import('./pages/ArendePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LogoutPage = lazy(() => import('./pages/LogoutPage'));

function Loading() {
  return (
    <main>
      <div className="w-screen h-screen flex place-items-center place-content-center">
        <Spinner size={12} aria-label="Laddar information" />
      </div>
    </main>
  );
}

function SuspenseWrapper({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

function RootLayout() {
  return (
    <LocalizationProvider locale="sv">
      <AppLayout>
        <SuspenseWrapper>
          <Outlet />
        </SuspenseWrapper>
      </AppLayout>
    </LocalizationProvider>
  );
}

export const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      errorElement: <ErrorPage />,
      children: [
        {
          index: true,
          element: <Navigate to="/oversikt" replace />,
        },
        {
          path: 'login',
          element: <LoginPage />,
        },
        {
          path: 'logout',
          element: <LogoutPage />,
        },
        {
          path: 'oversikt',
          element: <OversiktPage />,
        },
        {
          path: 'registrera',
          element: <RegistreraPage />,
        },
        {
          path: 'arende/:errandNumber',
          element: <ArendePage />,
        },
        {
          path: '*',
          element: <NotFoundPage />,
        },
      ],
    },
  ],
  {
    basename: import.meta.env.VITE_BASEPATH || '/MEX',
  }
);
