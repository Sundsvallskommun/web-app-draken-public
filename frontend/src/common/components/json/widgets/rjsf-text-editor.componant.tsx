'use client';

import TextEditor from '@common/components/dynamic-text-editor';
import { ariaDescribedByIds, titleId, type WidgetProps } from '@rjsf/utils';
import { cx } from '@sk-web-gui/react';
import { useEffect, useRef } from 'react';

interface RjsfTextEditorProps extends WidgetProps {
  defaultClassName: string;
  disableToolbar: boolean;
}

/**
 * Adapts the SK Quill editor to RJSF's field contract. The editor does not
 * forward DOM or ARIA props, so these attributes must be applied to the
 * generated contenteditable element after Quill has mounted.
 */
export function RjsfTextEditor({
  id,
  label,
  hideLabel,
  value,
  onBlur,
  onChange,
  onFocus,
  options,
  disabled,
  readonly,
  rawErrors,
  required,
  defaultClassName,
  disableToolbar,
}: RjsfTextEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const markupValue = typeof value === 'string' ? value : '';
  const configuredClassName = typeof options.className === 'string' ? options.className : defaultClassName;
  const isReadonly = Boolean(disabled || readonly);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const syncAccessibilityAttributes = () => {
      const editor = host.querySelector<HTMLElement>('.ql-editor');
      if (!editor) return;

      editor.id = id;
      editor.setAttribute('role', 'textbox');
      editor.setAttribute('aria-multiline', 'true');
      editor.setAttribute('aria-describedby', ariaDescribedByIds(id));
      editor.setAttribute('aria-invalid', String(Boolean(rawErrors?.length)));
      editor.setAttribute('aria-readonly', String(isReadonly));

      if (required) editor.setAttribute('aria-required', 'true');
      else editor.removeAttribute('aria-required');

      if (hideLabel) {
        editor.setAttribute('aria-label', label);
        editor.removeAttribute('aria-labelledby');
      } else {
        editor.setAttribute('aria-labelledby', titleId(id));
        editor.removeAttribute('aria-label');
      }
    };

    syncAccessibilityAttributes();
    const observer = new MutationObserver(syncAccessibilityAttributes);
    observer.observe(host, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [hideLabel, id, isReadonly, label, rawErrors, required]);

  return (
    <div ref={hostRef} className="min-w-0 max-w-full">
      <TextEditor
        name={id}
        className={cx('schema-text-editor w-full min-w-0 max-w-full', configuredClassName)}
        disableToolbar={disableToolbar}
        readOnly={isReadonly}
        value={{ markup: markupValue }}
        onSelectionChange={(range, oldRange) => {
          if (range && !oldRange) onFocus(id, markupValue);
          if (!range && oldRange) onBlur(id, markupValue);
        }}
        onChange={(event) => onChange(event.target.value.markup ?? '')}
      />
    </div>
  );
}
