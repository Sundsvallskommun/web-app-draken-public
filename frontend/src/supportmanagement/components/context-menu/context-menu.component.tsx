import { Popover } from '@headlessui/react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useState } from 'react';

export const ContextMenu: React.FC<{ items?: { action: Function; target: JSX.Element }[]; className: string }> = ({
  items = [],
  ...rest
}) => {
  const [activeElement, setActiveElement] = useState<HTMLAnchorElement>();
  return (
    <Popover {...rest}>
      {({ close }) => (
        <>
          <Popover.Button
            aria-label="Hantera"
            onKeyDown={(e: any) => {
              setActiveElement(e.target.closest('button'));
            }}
            onClick={(e: any) => {
              setActiveElement(e.target.closest('button'));
            }}
          >
            <MoreVertIcon fontSize={'large'} />
          </Popover.Button>
          {
            <Popover.Panel className="fixed ml-8 -mt-8 rounded-sm text-black bg-white border border-gray-stroke z-overlay w-max underline">
              {items.map((item, index) => (
                <div key={`item-${index}`}>
                  <a
                    className={`block px-md py-sm w-full hover:bg-hover hover:text-white`}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      close();
                      {
                        item.action();
                      }
                    }}
                  >
                    {item.target}
                  </a>
                </div>
              ))}
            </Popover.Panel>
          }
        </>
      )}
    </Popover>
  );
};
