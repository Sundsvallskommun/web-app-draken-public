'use client';

import { Tooltip } from '@sk-web-gui/react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const UnlinkedStatementAttachmentFlag: FC<{ fileName: string }> = ({ fileName }) => {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const note = t('common:statements.attachment_unlinked');

  return (
    <span
      className="relative inline-flex self-center shrink-0"
      onMouseEnter={() => setShown(true)}
      onMouseLeave={() => setShown(false)}
    >
      <button
        type="button"
        aria-label={`${note} ${fileName}`}
        data-cy="attachment-unlinked"
        className="w-12 h-12 rounded-full bg-warning-surface-primary"
        onFocus={() => setShown(true)}
        onBlur={() => setShown(false)}
      />
      <Tooltip
        position="left"
        className={`absolute right-[2rem] top-[-0.8rem] z-20 max-w-[24rem] ${shown ? '' : 'hidden'}`}
      >
        {note}
      </Tooltip>
    </span>
  );
};
