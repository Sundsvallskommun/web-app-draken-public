import { Attachment } from '@casedata/interfaces/attachment';
import { ACCEPTED_UPLOAD_FILETYPES, PTAttachmentLabels } from '@casedata/services/casedata-attachment-service';
import { isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import FileUpload from '@common/components/file-upload/file-upload.component';
import { useAppContext } from '@common/contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Chip, FormControl, FormErrorMessage, LucideIcon as Icon, Input, Modal } from '@sk-web-gui/react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { FileUploadWrapper } from '@common/components/file-upload/file-upload-dragdrop-context';

export interface SingleAppealAttachment {
  file: File | undefined;
  attachmentType: string;
  attachmentName: string;
}
export interface AppealAttachmentFormModel {
  id?: string;
  newAttachment: FileList | undefined;
  attachments: SingleAppealAttachment[];
  attachmentList: SingleAppealAttachment[];
  attachmentType: string;
  attachmentName: string;
}

const defaultAttachmentInformation: AppealAttachmentFormModel = {
  newAttachment: undefined,
  attachments: [],
  attachmentList: [],
  attachmentType: '',
  attachmentName: '',
};

export interface SavedAttachments {
  id: string;
  attachmentType: string;
  newAttachmentFields: SingleAppealAttachment[];
}

export const AppealAttachmentsComponent: React.FC = () => {
  const { errand, user } = useAppContext();
  const [addAttachmentWindowIsOpen, setAddAttachmentWindowIsOpen] = useState<boolean>(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment>();
  const [attachmentTypeExists, setAttachmentTypeExists] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  let formSchema = yup.object({
    id: yup.string(),
    newAttachment: yup.mixed(),
    attachments: yup.array().when('attachmentType', () => {
      return selectedAttachment ? yup.array() : yup.array().min(1).required('Fil måste bifogas');
    }),
    attachmentType: yup.string().required('Typ måste anges'),
    attachmentName: selectedAttachment ? yup.string().required('Namn måste anges') : yup.string(),
  });

  const {
    register,
    control,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<AppealAttachmentFormModel | ({ newItem: FileList | undefined } & Record<string, any>)>({
    resolver: yupResolver(formSchema),
    defaultValues: defaultAttachmentInformation,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const { fields, remove, append } = useFieldArray({
    name: 'appealAttachments',
  });

  const {
    fields: newAttachmentFields,
    append: newAppendAttachment,
    remove: newRemoveAttachment,
  } = useFieldArray({
    control,
    name: 'newAttachments',
  });

  const { newAttachment, attachmentType } = watch();

  const openHandler = () => {
    setAddAttachmentWindowIsOpen(true);
  };

  const closeHandler = () => {
    setAddAttachmentWindowIsOpen(false);
    reset();
  };

  return (
    <>
      <div className="w-full flex justify-between items-center flex-wrap">
        <div>
          <Input type="hidden" {...register('id')} />
          <Modal
            show={addAttachmentWindowIsOpen}
            className="w-[43rem]"
            onClose={() => {
              closeHandler();
              setSelectedAttachment(null);
            }}
            label={'Ladda upp bilaga'}
          >
            <FileUploadWrapper>
              <Modal.Content>
                <FormControl id="attachment" className="w-full mb-20">
                  <FileUpload
                    dragDrop={false}
                    fieldName="newAppealAttachments"
                    fields={newAttachmentFields}
                    items={newAttachment}
                    uniqueFileUploaderKey="casedata-appeal-attachments"
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                    append={newAppendAttachment}
                    remove={newRemoveAttachment}
                    editing={false}
                    accept={ACCEPTED_UPLOAD_FILETYPES}
                    helperText="Maximal filstorlek: 2 MB"
                    allowMultiple={false}
                  />
                </FormControl>

                {attachmentTypeExists ? (
                  <FormErrorMessage className="my-sm text-error">
                    En bilaga av denna typ finns redan. För att lägga till en ny, ta först bort den gamla.
                  </FormErrorMessage>
                ) : null}
              </Modal.Content>

              <Modal.Footer>
                <Button
                  disabled={!newAttachmentFields.length || !attachmentType}
                  onClick={() => {
                    append([{ newAttachmentFields, attachmentType: getValues('attachmentType') }]);
                    closeHandler();
                  }}
                >
                  Bifoga
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    newRemoveAttachment();
                    closeHandler();
                    setSelectedAttachment(null);
                  }}
                >
                  Avbryt
                </Button>
              </Modal.Footer>
            </FileUploadWrapper>
          </Modal>

          <Button
            data-cy="add-attachment-button"
            disabled={isErrandLocked(errand) || !allowed}
            leftIcon={<Icon name="paperclip" />}
            variant="tertiary"
            onClick={() => {
              setAttachmentTypeExists(false);
              reset();
              newRemoveAttachment();
              openHandler();
            }}
          >
            Bifoga fil
          </Button>

          {fields.length > 0 && (
            <div className="flex flex-wrap mt-16">
              {fields.map((attachment, index) => {
                const att = attachment as SavedAttachments;
                return (
                  <div key={`${attachment?.id}-${index}`}>
                    <Chip
                      className="mr-8 mt-8"
                      aria-label={`Ta bort bilaga ${attachment}`}
                      key={index}
                      onClick={() => {
                        remove(index);
                      }}
                    >
                      {`${PTAttachmentLabels[att?.attachmentType]}: ${att.newAttachmentFields[0].file[0].name}`}
                    </Chip>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
