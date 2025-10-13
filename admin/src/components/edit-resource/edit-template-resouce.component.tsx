import { Resource } from '@interfaces/resource';
import { PreviewTemplate } from '@services/templating/templating-service';
import { Button, FormControl, FormLabel, Input, RadioButton, Textarea } from '@sk-web-gui/react';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { FieldValues, useFormContext } from 'react-hook-form';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

interface EditResourceProps {
  isNew?: boolean;
}

export const EditTemplateResource: React.FC<EditResourceProps> = ({ isNew }) => {
  type CreateType = Parameters<NonNullable<Resource<FieldValues>['create']>>[0];
  type UpdateType = Parameters<NonNullable<Resource<FieldValues>['update']>>[1];
  type DataType = CreateType | UpdateType;

  const { register, watch, setValue } = useFormContext<DataType>();

  const { content, metadata } = watch();

  const hasRichTextEditor = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedMetadata: any[] = [];
    if (typeof metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch {
        return false;
      }
    } else if (Array.isArray(metadata)) {
      parsedMetadata = metadata;
    } else {
      return false;
    }
    return parsedMetadata.some((item) => item.key === 'editor' && item.value === 'richtexteditor');
  }, [metadata]);

  const previewTemplate = () => {
    PreviewTemplate(content as string).then((res) => {
      const uri = `data:application/pdf;base64,${res.data?.output}`;
      const link = document.createElement('a');
      link.href = uri;
      link.setAttribute('download', `preview.pdf`);
      document.body.appendChild(link);
      link.click();
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <FormControl required>
        <FormLabel>Identifierare</FormLabel>
        <Input {...register('identifier')} readOnly={!isNew} className="w-[53rem]" />
      </FormControl>
      <FormControl>
        <FormLabel>Namn</FormLabel>
        <Input {...register('name')} className="w-[53rem]" />
      </FormControl>
      <FormControl>
        <FormLabel>Beskrivning</FormLabel>
        <Input {...register('description')} className="w-[53rem]" />
      </FormControl>
      <FormControl>
        <FormLabel>Ändringslogg</FormLabel>
        <Input {...register('changeLog')} className="w-[53rem]" />
      </FormControl>
      <FormControl>
        <FormLabel>Mall</FormLabel>
        {hasRichTextEditor ?
          <TextEditor
            className="w-[130rem] h-[61.6rem] mb-[5rem]"
            onChange={(e) => {
              setValue('content', e.target.value.markup, {
                shouldDirty: true,
              });
            }}
            value={{ markup: content }}
          />
        : <Textarea {...register('content')} rows={25} className="w-[130rem]" />}
      </FormControl>
      <FormControl>
        <FormLabel>Metadata</FormLabel>
        <Textarea {...register('metadata')} rows={25} className="w-[130rem]" />
      </FormControl>
      <FormControl>
        <FormLabel>Standardvärden</FormLabel>
        <Textarea rows={25} className="w-[130rem]" />
      </FormControl>
      <FormControl>
        <FormLabel>Versionsökning</FormLabel>
        <RadioButton.Group inline>
          <RadioButton value={'MINOR'} defaultChecked {...register('versionIncrement')}>
            Minor
          </RadioButton>
          <RadioButton value={'MAJOR'} {...register('versionIncrement')}>
            Major
          </RadioButton>
        </RadioButton.Group>
      </FormControl>
      <div className="flex flex-row gap-6">
        <Button onClick={previewTemplate}>Förhandsgranska mall</Button>
      </div>
    </div>
  );
};
