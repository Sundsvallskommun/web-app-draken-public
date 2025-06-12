import sanitized from '@common/services/sanitizer-service';
import { MutableRefObject } from 'react';
import { UseFormTrigger } from 'react-hook-form';
import TextEditor from '@sk-web-gui/text-editor';
import { cx } from '@sk-web-gui/react';

export interface ContractTextEditorWrapperProps {
  editorRef: MutableRefObject<any>;
  readOnly: boolean;
  val: string;
  label: string;
  setDirty: (dirty: boolean) => void;
  setValue: (label: string, value: string) => void;
  trigger: UseFormTrigger<any>;
  setState: (state: any) => void;
}

export const ContractTextEditorWrapper: React.FC<ContractTextEditorWrapperProps> = (props) => {
  const { editorRef, readOnly, val, label, setDirty, setValue, trigger, setState } = props;
  return (
    <TextEditor
      className={cx(`mb-md h-[80%]`)}
      ref={editorRef}
      readOnly={readOnly}
      defaultValue={val}
      onTextChange={(delta, oldDelta, source) => {
        if (source === 'user') {
          setDirty(true);
        }
        const text = editorRef.current.getSemanticHTML();
        console.log('text', editorRef.current.root.innerHTML);
        setState(text);
        setValue(label, sanitized((delta.ops[0].retain as any) > 1 ? editorRef.current.getSemanticHTML() : undefined));
        trigger(label);
        return;
      }}
    />
  );
};
