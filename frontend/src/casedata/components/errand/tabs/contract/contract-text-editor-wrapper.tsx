'use client';

import sanitized from '@common/services/sanitizer-service';
import { MutableRefObject } from 'react';
import { UseFormTrigger } from 'react-hook-form';
import dynamic from 'next/dynamic';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });
import { cx } from '@sk-web-gui/react';

export interface ContractTextEditorWrapperProps {
  readOnly: boolean;
  val: string;
  label: string;
  setDirty: (dirty: boolean) => void;
  setValue: (label: string, value: string) => void;
  trigger: UseFormTrigger<any>;
  setState?: (state: any) => void;
}

export const ContractTextEditorWrapper: React.FC<ContractTextEditorWrapperProps> = (props) => {
  const { readOnly, val, label, setDirty, setValue, trigger, setState } = props;
  return (
    <TextEditor
      className={cx(`mb-md h-[80%]`)}
      readOnly={readOnly}
      value={{ markup: val }}
      onChange={(e) => {
        setValue(label, e.target.value.markup);
        trigger(label);
        if (setState) {
          setState(e.target.value.markup);
        }
      }}
      onTextChange={(delta, oldDelta, source) => {
        if (source === 'user') {
          setDirty(true);
        }
      }}
    />
  );
};
