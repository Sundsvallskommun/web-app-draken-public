import { cx } from '@sk-web-gui/react';

interface HeaderProps {
  className?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ className, children }) => {
  return (
    <header
      className={cx(
        'mb-32 flex flex-col gap-6 border-b-1 border-b-divider pb-16 h-[9.6rem] justify-center align-start relative',
        className
      )}
    >
      {children}
    </header>
  );
};
