import EmptyLayout from '@layouts/empty-layout/empty-layout.component';
import { Spinner } from '@sk-web-gui/react';

export default function LoaderFullScreen() {
  return (
    <EmptyLayout title={`${process.env.NEXT_PUBLIC_APP_NAME} - Laddar`}>
      <main>
        <div className="w-screen h-screen flex place-items-center place-content-center">
          <Spinner size={12} aria-label="Laddar information" />
        </div>
      </main>
    </EmptyLayout>
  );
}
