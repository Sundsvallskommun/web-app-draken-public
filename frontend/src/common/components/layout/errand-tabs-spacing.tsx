'use client';
import { useGui } from '@sk-web-gui/react';

export default function ErrandTabsSpacing({ children }: { children: React.ReactNode }) {
  const { theme } = useGui();

  return (
    <div className="flex justify-center overflow-y-auto w-full max-lg:mr-[5.6rem]">
      <main
        className="flex-grow flex justify-center max-w-content w-full pb-40"
        style={{
          maxWidth: `calc(${theme.spacing['max-content']} + (100vw - ${theme.spacing['max-content']})/2)`,
          minHeight: `calc(100vh - 7.2rem)`,
        }}
      >
        <div className="flex-grow w-full max-w-screen-lg">{children}</div>
      </main>
    </div>
  );
}
