'use client';
import type { WidgetProps } from '@rjsf/utils';
import dynamic from 'next/dynamic';
import * as React from 'react';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

export function TexteditorWidget({ value, onChange }: WidgetProps) {
  const ref = React.useRef<any>(null);

  React.useEffect(() => {
    const root = ref.current?.root;
    if (root && typeof value === 'string' && root.innerHTML !== value) {
      root.innerHTML = value;
    }
  }, [value]);

  return (
    <TextEditor
      className="w-full max-w-[40rem]"
      ref={ref}
      defaultValue={value ?? ''}
      onTextChange={() => {
        const html = ref.current?.root?.innerHTML ?? '';
        onChange(html);
      }}
    />
  );
}
