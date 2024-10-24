import { Button, cx, LucideIcon as Icon, Tooltip, useGui } from '@sk-web-gui/react';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { SidebarNotes } from '../../../casedata/components/errand/sidebar/sidebar-notes.component';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { SidebarComments } from '../../../casedata/components/errand/sidebar/sidebar-comments.component';
import { SidebarInfo } from '../../../casedata/components/errand/sidebar/sidebar-info.component';
import { SidebarUtredning } from '../../../casedata/components/errand/sidebar/sidebar-utredning.component';
import { SidebarHistory } from '../../../casedata/components/errand/sidebar/sidebar-history.component';
import { SidebarGuide } from '../../../casedata/components/errand/sidebar/sidebar-guide.component';
import { useMediaQuery } from 'usehooks-ts';
import { SidebarTooltip } from '../../../casedata/components/errand/sidebar/sidebar-tooltip.component';
import { isPT } from '@common/services/application-service';

export type SidebarButtonKey =
  | 'notes'
  | 'info'
  | 'history'
  | 'comments'
  | 'guides'
  | 'todo'
  | 'investigation'
  | undefined;

export const Sidebar: React.FC<{
  buttons: {
    label: string;
    key: SidebarButtonKey;
    icon: string;
    component: React.ReactNode;
  }[];
}> = ({ buttons }) => {
  const [open, setOpen] = useState(true);
  const [hover, setHover] = useState<SidebarButtonKey>();
  const [scrolled, setScrolled] = useState<number>(0);
  const [selected, setSelected] = useState<SidebarButtonKey>('info');
  const [active, setActive] = useState<number>(buttons.findIndex((button) => selected === button.key));
  const menuRef = useRef<HTMLDivElement>(null);
  const gui = useGui();
  const isLg = useMediaQuery(`screen and (min-width: ${gui.theme.screens.lg})`);

  const updateScroll = () => {
    if (menuRef.current) {
      setScrolled(menuRef.current.scrollTop);
    }
  };

  const handleKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowUp':
        const prevIndex = index === 0 ? buttons.length : index - 1;
        document.getElementById(`sidebar-button-${prevIndex}`).focus();
        setActive(prevIndex);
        break;
      case 'ArrowDown':
        const nextIndex = index === buttons.length ? 0 : index + 1;
        document.getElementById(`sidebar-button-${nextIndex}`).focus();
        setActive(nextIndex);
        break;
      default:
        break;
    }
  };

  return (
    <aside
      data-cy="manage-sidebar"
      className={cx(
        'transition-all ease-in-out duration-150 absolute lg:static flex bg-background-content h-full max-w-full  max-h-full',
        open ? 'max-lg:shadow-100 w-full sm:w-[40rem] sm:min-w-[40rem]' : 'w-[5.6rem]'
      )}
    >
      <div
        className="h-full bg-transparent flex flex-col pt-18 lg:pt-32 gap-12 pb-12 w-0"
        style={{ marginTop: `-${scrolled}px` }}
      >
        {buttons.map((b, idx) =>
          isPT() && b.key === 'guides' ? null : (
            <SidebarTooltip key={`sidebartooltip-${idx}`} open={hover === b.key}>
              {b.label}
            </SidebarTooltip>
          )
        )}
      </div>
      <div
        onScroll={() => updateScroll()}
        ref={menuRef}
        role="menubar"
        aria-orientation="vertical"
        className="h-full flex flex-col justify-between border-1 border-y-0 border-divider overflow-y-auto overflow-x-visible min-w-[5.6rem]"
      >
        <div role="none" className="flex flex-col pt-18 lg:pt-32 gap-12 pb-12 items-center w-full px-8">
          {buttons.map((b, idx) =>
            isPT() && (b.key === 'guides' || b.key === 'investigation') ? null : (
              <div key={`sidebarkey-${idx}`} className="relative w-full flex justify-center" role="none">
                <Button
                  role="menuitem"
                  key={`sidebarbutton-${b.key}`}
                  size={isLg ? 'md' : 'sm'}
                  aria-label={b.label}
                  id={`sidebar-button-${idx}`}
                  onClick={() => {
                    setSelected(b.key as SidebarButtonKey);
                    setOpen(true);
                  }}
                  onKeyDown={(e) => handleKeyboard(e, idx)}
                  onMouseEnter={() => setHover(b.key)}
                  onMouseLeave={() => setHover(undefined)}
                  color="primary"
                  inverted={selected !== b.key}
                  tabIndex={active === idx ? 0 : -1}
                  iconButton
                  leftIcon={
                    <>
                      <Icon name={b.icon as keyof typeof dynamicIconImports} />
                    </>
                  }
                />
              </div>
            )
          )}
        </div>
        <div className="flex gap-12 pt-24 w-full justify-center pb-12">
          <Button
            id={`sidebar-button-${buttons.length}`}
            color="primary"
            size={isLg ? 'md' : 'sm'}
            variant="tertiary"
            aria-label={open ? 'Stäng sidomeny' : 'Öppna sidomeny'}
            iconButton
            tabIndex={active === buttons.length ? 0 : -1}
            leftIcon={open ? <Icon name="chevrons-right" /> : <Icon name="chevrons-left" />}
            onClick={() => setOpen(!open)}
            onKeyDown={(e) => handleKeyboard(e, buttons.length)}
          />
        </div>
      </div>
      <div className={cx(`overflow-x-hidden overflow-y-auto`, open ? 'w-full px-20' : 'w-0 px-0')}>
        <div className="h-fit w-full py-32">
          {buttons.find((b) => b.key === selected)?.component || <></>}
          {/* {selected === 'info' ? (
            <SidebarInfo />
          ) : selected === 'notes' ? (
            <SidebarNotes />
          ) : selected === 'comments' ? (
            <SidebarComments />
          ) : selected === 'guides' ? (
            <SidebarGuide />
          ) : selected === 'investigation' ? (
            <SidebarUtredning />
          ) : selected === 'history' ? (
            <SidebarHistory />
          ) : (
            <></>
          )} */}
        </div>
      </div>
    </aside>
  );
};