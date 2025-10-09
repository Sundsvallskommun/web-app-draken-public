import { MAX_FILE_SIZE_MB } from '@casedata/services/casedata-attachment-service';
import { isIK, isKC, isLOP, isMEX } from '@common/services/application-service';
import { Button, cx, FormControl, FormErrorMessage, FormHelperText, FormLabel, Input, Select } from '@sk-web-gui/react';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { UseFormRegister } from 'react-hook-form';
import { MEXAttachmentLabels, PTAttachmentLabels } from '@casedata/interfaces/attachment';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { UploadCloud } from 'lucide-react';
import { useFileUpload } from './file-upload-dragdrop-context';

export const imageMimeTypes = [
  'image/jpeg',
  'image/gif',
  'image/png',
  'image/tiff',
  'image/bmp',
  'image/heic',
  'image/heif',
];

const FileUpload: React.FC<{
  dragDrop: boolean;
  fieldName: string;
  fields: any[];
  items: any[];
  uniqueFileUploaderKey: string;
  register: UseFormRegister<any>;
  setValue: (key: string, item: any) => void;
  watch: (key: string) => any;
  errors: any;
  append: (item: any) => void;
  remove: (index: number) => void;
  accept?: string[];
  editing: boolean;
  allowMultiple?: boolean;
  allowNameChange?: boolean;
  helperText?: string;
}> = (props) => {
  const {
    dragDrop,
    fieldName,
    fields,
    items,
    uniqueFileUploaderKey,
    register,
    setValue,
    watch,
    errors,
    append,
    remove,
    accept = [],
    editing,
    allowMultiple,
    allowNameChange = true,
    helperText,
  } = props;
  const [error, setError] = useState<string>();
  const newItem: FileList = watch(`${fieldName}-newItem`);
  const [inputKey, setInputKey] = useState<string>();
  const [firstLoad, setFirstLoad] = useState(true);

  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [added, setAdded] = useState<number>(0);

  const ref = useRef<HTMLLabelElement>(null);

  const { featureFlags } = useAppContext();

  const appendNewItem = () => {
    setError(undefined);
    if (newItem !== undefined) {
      if (newItem.length > 1) {
        let N = added;
        Array.from(newItem).map((n, index) => {
          if (n) {
            const file = new File([n], n.name, {
              type: n.type,
              lastModified: n.lastModified,
            });

            const ext = `${file?.name?.split('.').pop()}`;
            if (accept.length !== 0 && !accept.includes(ext.toLowerCase())) {
              const t = `Fel filtyp - ${file.name}`;
              // setError(t);
              setFileErrors((fileErrors) => [...fileErrors, t]);
            } else if (file.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
              const s = `Filen är för stor (${(file.size / 1024 / 1024).toFixed(1)} MB) - ${file.name}`;
              // setError(s);
              setFileErrors((fileErrors) => [...fileErrors, s]);
            } else {
              append({ attachmentType: '', file: [n], main: N === 0 });
              N += 1;
              setValue(`newItem`, undefined);
              setError(undefined);
            }
          }
        });
      } else if (newItem.length === 1) {
        if (newItem[0]?.size > 0) {
          const ext = newItem[0].name.split('.').pop();
          if (accept.length === 0 || accept.includes(ext.toLowerCase())) {
            append({ file: newItem });
            setValue('attachmentName', newItem[0].name.toString());
            setInputKey(newItem[0].name);
          } else {
            setError(`Filtypen stöds inte.`);
          }
        } else {
          setError('Bilagan du försöker lägga till är tom. Försök igen.');
        }
      }
    }
  };

  useEffect(() => {
    if (!firstLoad) {
      appendNewItem();
    }
    setFirstLoad(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newItem]);

  useEffect(() => {
    setValue(`${fieldName}-newItem`, undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const length = fields.length;
    if (added !== length) {
      setAdded(length);
    }
    //eslint-disable-next-line
  }, [fields]);

  const { drop, setDrop, setActive } = useFileUpload();

  useEffect(() => {
    setActive && setActive(true);

    return () => {
      setActive && setActive(false);
    };
  }, [setActive]);

  useEffect(() => {
    if (drop && drop.length > 0) {
      setValue(`${fieldName}-newItem`, drop);
    }
    setDrop && setDrop(null);
  });

  const handleKeyPress = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      ref.current && ref.current.click();
    }
  };

  const editFields = (index?: number) =>
    featureFlags?.isCaseData && (
      <>
        {!dragDrop && editing && (
          <FormControl id="name" className="w-full">
            <FormLabel>Namn på bilaga</FormLabel>
            <Input
              data-cy="edit-filename-input"
              type="text"
              {...register(dragDrop ? `attachments.${index}.attachmentName` : 'attachmentName')}
            />
          </FormControl>
        )}

        {((dragDrop && fields.length === 1) || !dragDrop) && (
          <FormControl id="attachmentTyp" className="w-full">
            <FormLabel>Typ av bilaga</FormLabel>

            <Input type="hidden" {...register(dragDrop ? `attachments.${index}.attachmentType` : 'attachmentType')} />
            <Select
              data-cy="attachmentType"
              size="md"
              className="w-full"
              variant="tertiary"
              onChange={(e) =>
                setValue(dragDrop ? `attachments.${index}.attachmentType` : 'attachmentType', e.target.value)
              }
              {...register(dragDrop ? `attachments.${index}.attachmentType` : 'attachmentType')}
            >
              <Select.Option value="">Välj typ av bilaga</Select.Option>
              {Object.entries(isMEX() ? MEXAttachmentLabels : PTAttachmentLabels)
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([key, label]) => {
                  return (
                    <Select.Option
                      key={label}
                      value={key}
                      className={cx(`cursor-pointer select-none relative py-4 pl-10 pr-4`)}
                    >
                      {label}
                    </Select.Option>
                  );
                })}
            </Select>
          </FormControl>
        )}
      </>
    );

  const singleUploadNotDragDrop = !dragDrop && fields.length === 0;

  return (
    <>
      {!editing && (singleUploadNotDragDrop || dragDrop || allowMultiple) ? (
        <div className="flex flex-col gap-16">
          {dragDrop ? (
            <div>
              <div className="flex flex-col items-start mb-16">
                <FormLabel ref={ref} className="w-full">
                  <span className="mb-sm text-label font-bold hidden">Bilaga</span>
                  <div
                    data-cy="dragdrop-upload"
                    role="input"
                    onKeyDown={handleKeyPress}
                    aria-label="Bilaga"
                    tabIndex={0}
                    className={cx(
                      'rounded-utility',
                      'focus-within:ring',
                      'focus-within:ring-ring',
                      'focus-within:ring-offset',
                      'text-base gap-16 box-border flex justify-center items-center',
                      'p-12 md:p-24 xl:p-32',
                      'border border-divider',
                      'hover:bg-vattjom-background-100 hover:border-2 border-dashed cursor-pointer'
                    )}
                  >
                    <UploadCloud className={cx('!h-[4rem] !w-[4rem] text-primary')} />
                    <div className="flex flex-col gap-8 justify-center">
                      <div className="text-base font-normal">
                        Dra {allowMultiple ? 'filer' : 'en fil'} hit eller{' '}
                        <span className="underline text-vattjom-text-primary">klicka för att bläddra på din enhet</span>
                      </div>
                      {helperText && (
                        <FormHelperText className="p-0 m-0 text-small text-dark-secondary">{helperText}</FormHelperText>
                      )}
                    </div>
                  </div>
                  <Input
                    className="hidden"
                    type="file"
                    accept={accept.join(',')}
                    multiple={allowMultiple}
                    placeholder="Välja fil att lägga till"
                    {...register(`${fieldName}-newItem`)}
                    //allowReplace={false}
                  />
                </FormLabel>
              </div>
            </div>
          ) : (
            <>
              <p>Ladda upp en fil från din dator</p>

              <div className="flex items-center w-full justify-between">
                <Button
                  data-cy="browse-button"
                  className="w-full"
                  rounded
                  variant="secondary"
                  onClick={() => {
                    document.getElementById(`${uniqueFileUploaderKey}-openFileupload`).click();
                  }}
                >
                  Bläddra
                </Button>

                <div className="hidden">
                  <FormControl id="new-attachment-item">
                    <FormLabel>Välj fil att lägga till</FormLabel>
                    <Input
                      aria-labelledby="new-attachment-item-label"
                      key={inputKey}
                      id={`${uniqueFileUploaderKey}-openFileupload`}
                      type="file"
                      accept={accept.join(',')}
                      placeholder="Välj fil att lägga till"
                      {...register(`${fieldName}-newItem`)}
                    />
                  </FormControl>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
      {errors.newItem && (
        <div className="my-sm">
          <FormErrorMessage>{errors.newItem?.[0].message}</FormErrorMessage>
        </div>
      )}
      {error && (
        <div className="my-sm">
          <FormErrorMessage>{error}</FormErrorMessage>
        </div>
      )}

      {fileErrors.length > 0 &&
        fileErrors.map((e, idx) => (
          <FormErrorMessage key={`fileError-${idx}`} className="my-sm">
            {e}
          </FormErrorMessage>
        ))}

      {fields.length !== 0 && (
        <div>
          <ul className="flex flex-col" data-cy="attachment-wrapper">
            {fields.map((field, index) => {
              return (
                <li
                  className={`${
                    isIK() || isLOP() ? 'border-1 rounded-16 p-16 border-divider' : ''
                  } flex flex-col gap-16`}
                  key={field.id}
                >
                  <div className={`${!isKC() || isIK() || isLOP() ? 'border rounded p-16 my-sm' : 'my-sm'} w-full`}>
                    {!editing && (
                      <div className="flex justify-between">
                        <div className="flex w-5/6 gap-10">
                          <div className="bg-vattjom-surface-accent pt-4 pb-0 px-4 rounded self-center">
                            <LucideIcon
                              name={imageMimeTypes.includes(field.file[0]?.type) ? 'image' : 'file'}
                              size={25}
                            />
                          </div>
                          <div className="overflow-hidden">
                            <p className="self-center" title={field.file[0]?.name}>
                              {field.file[0]?.name}
                            </p>
                          </div>
                        </div>
                        <div>
                          <Button
                            aria-label={`Ta bort ${field.file[0]?.name}`}
                            iconButton
                            inverted
                            className="self-end"
                            onClick={(e) => {
                              e.preventDefault();
                              remove(index);
                            }}
                          >
                            <LucideIcon name="x" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {allowNameChange ? editFields(index) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {editing ? editFields() : null}
    </>
  );
};

export default FileUpload;
