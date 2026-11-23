import { Disclosure } from '@sk-web-gui/react';
import { createContext, FC, ReactElement, ReactNode, useContext } from 'react';

/**
 * How the sections of an errand tab are framed: as collapsible disclosures, or as plain
 * grey boxes with only a header, for trying out layouts.
 */
export type ErrandSectionLook = 'disclosure' | 'box';

/** A typewriter look, so nobody takes a prototype for the finished design. */
export const PROTOTYPE_FONT = "font-['Courier_New',Courier,monospace]";

/** Tells the reader that what follows is a layout being tried out, not the finished design. */
export const PrototypeBanner: FC<{ children: ReactNode }> = ({ children }) => (
  <div
    className={`${PROTOTYPE_FONT} border-2 border-dashed border-gray-500 bg-gray-200 px-16 py-8 uppercase tracking-wide text-small`}
    data-cy="prototype-banner"
  >
    {children}
  </div>
);

const ErrandSectionLookContext = createContext<ErrandSectionLook>('disclosure');

export const ErrandSectionLookProvider = ErrandSectionLookContext.Provider;

export const ErrandSection: FC<{
  icon: ReactElement;
  title: ReactNode;
  initialOpen?: boolean;
  disabled?: boolean;
  'data-cy'?: string;
  children: ReactNode;
}> = ({ icon, title, initialOpen, disabled, children, ...rest }) => {
  const look = useContext(ErrandSectionLookContext);

  if (look === 'box') {
    return (
      <section
        data-cy={rest['data-cy']}
        className={`${PROTOTYPE_FONT} bg-gray-100 border-2 border-dashed border-gray-500 p-16 my-12`}
      >
        <h3 className="flex justify-between gap-8 uppercase tracking-wide text-base font-bold mb-12 pb-8 border-b-2 border-dashed border-gray-500">
          <span>{title}</span>
          <span className="font-normal normal-case text-gray-500">[prototyp]</span>
        </h3>
        {children}
      </section>
    );
  }

  return (
    <Disclosure variant="alt" initalOpen={initialOpen} disabled={disabled} data-cy={rest['data-cy']}>
      <Disclosure.Header>
        <Disclosure.Icon icon={icon} />
        <Disclosure.Title>{title}</Disclosure.Title>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>{children}</Disclosure.Content>
    </Disclosure>
  );
};
