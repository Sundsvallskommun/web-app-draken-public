'use client';

import DynamicTextEditor from '@common/components/dynamic-text-editor';
import { useTextEditorPlaceholder } from '@common/components/use-text-editor-placeholder';
import { FormControl, FormLabel } from '@sk-web-gui/react';
import { SUPPORT_INVESTIGATION_TEXT_MAX_LENGTH } from '@supportmanagement/services/support-investigation-service';
import { FC, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export const InvestigationTextEditor: FC<{
  name: string;
  labelKey: string;
  placeholderKey: string;
  value: string;
  readOnly: boolean;
  onChange: (markup: string) => void;
}> = ({ name, labelKey, placeholderKey, value, readOnly, onChange }) => {
  const { t } = useTranslation();

  const editorHost = useRef<HTMLDivElement>(null);
  useTextEditorPlaceholder(editorHost, t(placeholderKey));

  return (
    <FormControl className="w-full">
      <FormLabel>{t(labelKey)}</FormLabel>
      <div ref={editorHost} data-cy={`${name}-text`}>
        <DynamicTextEditor
          name={name}
          className="investigation-text-editor w-full min-w-0 max-w-full"
          readOnly={readOnly}
          value={{ markup: value }}
          onChange={(event: { target: { value: { markup?: string } } }) =>
            onChange((event.target.value.markup ?? '').slice(0, SUPPORT_INVESTIGATION_TEXT_MAX_LENGTH))
          }
        />
      </div>
    </FormControl>
  );
};
