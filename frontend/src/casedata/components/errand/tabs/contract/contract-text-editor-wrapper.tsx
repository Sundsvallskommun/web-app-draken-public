// import { RichTextEditor } from '@common/components/rich-text-editor/rich-text-editor.component';
import sanitized from '@common/services/sanitizer-service';
import { MutableRefObject } from 'react';
import { UseFormTrigger } from 'react-hook-form';
import TextEditor from '@sk-web-gui/text-editor';

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
    // ref={editorRef}
    // readOnly={readOnly}
    // containerLabel="overlatelseforklaring"
    // value={val}
    // onChange={(value, _delta, source, _editor) => {
    //   if (source === 'user') {
    //     setDirty(true);
    //   }
    //   const editor = editorRef.current.getEditor();
    //   const length = editor.getLength();
    //   // Amazing fix for newline removal bug
    //   if (value && value.substring(value.length - 11) == '<p><br></p>') {
    //     value = value.substring(0, value.length - 11) + '<p>&#8205;</p>';
    //   }
    //   setState(value);
    //   setValue(label, sanitized(length > 1 ? value : undefined));
    //   trigger(label);
    //   return;
    // }}
    />
  );
};
