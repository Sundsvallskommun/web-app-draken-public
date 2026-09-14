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
}: Readonly<RjsfTextEditorProps>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const markupValue = typeof value === 'string' ? value : '';
  const configuredClassName = typeof options.className === 'string' ? options.className : defaultClassName;
  const isReadonly = Boolean(disabled || readonly);
  // FieldTemplate also hides the label on ui:options.hideLabel, which RJSF's hideLabel does not cover.
  const labelHidden = Boolean(hideLabel || options.hideLabel);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const syncAccessibilityAttributes = (): boolean => {
      const editor = host.querySelector<HTMLElement>('.ql-editor');
      if (!editor) return false;

      editor.id = id;
      editor.setAttribute('role', 'textbox');
      editor.setAttribute('aria-multiline', 'true');
      editor.setAttribute('aria-describedby', ariaDescribedByIds(id));
      editor.setAttribute('aria-invalid', String(Boolean(rawErrors?.length)));
      editor.setAttribute('aria-readonly', String(isReadonly));

      if (required) editor.setAttribute('aria-required', 'true');
      else editor.removeAttribute('aria-required');

      if (labelHidden) {
        editor.setAttribute('aria-label', label);
        editor.removeAttribute('aria-labelledby');
      } else {
        editor.setAttribute('aria-labelledby', titleId(id));
        editor.removeAttribute('aria-label');
      }
      return true;
    };

    // Quill mounts through next/dynamic, so the editor may not exist yet. Observe only until it
    // does; typing mutates the editor's children and must not re-run the sync on every keystroke.
    if (syncAccessibilityAttributes()) return;
    const observer = new MutationObserver(() => {
      if (syncAccessibilityAttributes()) observer.disconnect();
    });
    observer.observe(host, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [labelHidden, id, isReadonly, label, rawErrors, required]);

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
