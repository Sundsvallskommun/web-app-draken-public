import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Header, cx } from '@sk-web-gui/react';
import React from 'react';

export const AttestationInvoiceWrapperComponent: React.FC<{
  show: boolean;
  label: string;
  closeHandler: () => void;
  children: any;
}> = ({ show, label = '', closeHandler, children }) => (
  <>
    <div className={cx(show ? 'sk-modal-wrapper' : 'fixed')}></div>
    <section
      className={cx(
        `border-1 border-t-0 absolute right-0 bottom-0 top-0 bg-background-content transition-all ease-in-out duration-150 overflow-auto z-[20] shadow-100`,
        show ? 'w-full md:min-w-[50rem] md:w-[50vw] lg:w-[38vw]' : 'w-0 px-0'
      )}
    >
      <Header className="h-[64px] flex justify-between" wrapperClasses="py-4 px-40">
        <div className="text-h4-sm flex items-center gap-12">
          <LucideIcon name="glasses" /> {label}
        </div>
        <Button
          tabIndex={show ? 0 : -1}
          aria-label="Stäng fakturapost"
          iconButton
          variant="tertiary"
          onClick={() => {
            closeHandler();
          }}
          data-cy="close-invoice-wrapper"
        >
          <LucideIcon name="x" data-cy="close-invoice-wrapper-icon" />
        </Button>
      </Header>
      {children}
    </section>
  </>
);
