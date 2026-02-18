import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Header, cx } from '@sk-web-gui/react';
import React, { useEffect } from 'react';

interface DetailPanelWrapperProps {
  show: boolean;
  label: string;
  closeAriaLabel: string;
  closeHandler: () => void;
  icon: 'glasses' | 'file-text';
  children: React.ReactNode;
  dataCy?: string;
}

export const DetailPanelWrapper: React.FC<DetailPanelWrapperProps> = ({
  show,
  label = '',
  closeAriaLabel,
  closeHandler,
  icon,
  children,
  dataCy,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && show) {
        closeHandler();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, closeHandler]);

  return (
    <>
      <div className={cx(show ? 'sk-modal-wrapper cursor-pointer' : 'fixed')} onClick={closeHandler}></div>
      <section
        data-cy={dataCy ? `${dataCy}-panel` : undefined}
        className={cx(
          `border-1 border-t-0 absolute right-0 bottom-0 top-0 bg-background-content transition-all ease-in-out duration-150 overflow-auto z-[20] shadow-100`,
          show ? 'w-full md:min-w-[50rem] md:w-[50vw] lg:w-[38vw]' : 'w-0 px-0'
        )}
      >
        <Header className="h-[64px] flex justify-between" wrapperClasses="py-4 px-40">
          <div className="text-h4-sm flex items-center gap-12">
            <LucideIcon name={icon} /> {label}
          </div>
          <Button
            tabIndex={show ? 0 : -1}
            aria-label={closeAriaLabel}
            iconButton
            variant="tertiary"
            onClick={() => {
              closeHandler();
            }}
            data-cy={dataCy ? `close-${dataCy}-wrapper` : undefined}
          >
            <LucideIcon name="x" data-cy={dataCy ? `close-${dataCy}-wrapper-icon` : undefined} />
          </Button>
        </Header>
        {children}
      </section>
    </>
  );
};
