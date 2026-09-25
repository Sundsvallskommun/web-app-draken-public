import { customerPagesEnabled } from '@common/services/feature-flag-service';
import { Button, cx, Divider } from '@sk-web-gui/react';
import { ChartColumn, Contact } from 'lucide-react';
import NextLink from 'next/link';
import { FC } from 'react';

const customerLinks = [
  { href: '/kundbild', label: 'Kundbild', icon: <Contact /> },
  { href: '/statistik', label: 'Statistik', icon: <ChartColumn /> },
];

export const CustomerMenu: FC<{ open: boolean }> = ({ open }) => {
  if (!customerPagesEnabled()) {
    return null;
  }

  return (
    <>
      <Divider className={cx(open ? '' : 'w-[4rem] mx-auto')} />
      <div
        className={cx('flex flex-col gap-8', open ? 'py-24' : 'items-center justify-center py-15')}
        data-cy="customer-menu"
      >
        {open && <span className="text-small font-bold text-dark-secondary uppercase">Kunder</span>}
        {customerLinks.map((link) => (
          <NextLink key={link.href} href={link.href} passHref className="no-underline">
            <Button
              leftIcon={link.icon}
              className={cx('w-full hover:bg-dark-ghost', open && 'justify-start')}
              variant="ghost"
              iconButton={!open}
              aria-label={link.label}
              data-cy={`customer-menu-link-${link.label.toLowerCase()}`}
            >
              {open && <span className="w-full flex justify-between">{link.label}</span>}
            </Button>
          </NextLink>
        ))}
      </div>
    </>
  );
};
