import FileUpload from '@common/components/file-upload/file-upload.component';
import { Button, FormControl, FormLabel, LucideIcon as Icon, Input, Modal, useSnackbar } from '@sk-web-gui/react';
import { useAppContext } from '@contexts/app.context';
import { useEffect, useState } from 'react';
import { getErrand, isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { useFieldArray, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { saveSignedContractAttachment } from '@casedata/services/contract-service';

export interface CasedataSignedContractAttachmentFormModel {
  id?: string;
  attachment: { file: File | undefined }[];
  attachmentType: string;
  attachmentName: string;
  note?: string;
}

export const CasedataContractAttachmentUpload: React.FC<{ contractId: string }> = ({ contractId }) => {
  const { municipalityId, errand, setErrand, user } = useAppContext();
  const [addAttachmentWindowIsOpen, setAddAttachmentWindowIsOpen] = useState<boolean>(false);

  const toastMessage = useSnackbar();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  let formSchema = yup.object({
    id: yup.string(),
    content: yup.string(),
    category: yup.string(),
    filename: yup.string(),
    mimeType: yup.string(),
    note: yup.string(),
  });

  const {
    register,
    control,
    watch,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CasedataSignedContractAttachmentFormModel>({
    resolver: yupResolver(formSchema),
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const {
    fields: contractAttachmentFields,
    append: appendContractAttachment,
    remove: removeContractAttachment,
  } = useFieldArray({
    control,
    name: 'attachment',
  });

  const openHandler = () => {
    setAddAttachmentWindowIsOpen(true);
  };

  const closeHandler = () => {
    setAddAttachmentWindowIsOpen(false);
    removeContractAttachment();
    setValue('note', '');
  };

  const attachment = watch('attachment');

  return (
    <>
      <Input type="hidden" {...register('id')} />
      <Modal
        show={addAttachmentWindowIsOpen}
        className="w-[43rem]"
        onClose={() => {
          closeHandler();
          reset();
        }}
        label={'Ladda upp bilaga'}
      >
        <FormControl id="contract-attachment" className="w-full">
          <FileUpload
            fieldName="contract-attachment"
            uniqueFileUploaderKey="casedata-contract-attachment"
            fields={contractAttachmentFields}
            items={attachment}
            register={register}
            setValue={setValue}
            watch={watch}
            errors={errors}
            append={appendContractAttachment}
            remove={removeContractAttachment}
            editing={false}
            accept={['pdf']}
            allowMultiple={false}
            dragDrop={false}
          />

          {contractAttachmentFields?.length ? (
            <div className="mt-8 mb-16">
              <FormControl id="note" className="w-full">
                <FormLabel>Anteckning</FormLabel>
                <Input {...register('note')} />
              </FormControl>
            </div>
          ) : null}

          <Modal.Footer>
            <Button
              className="w-full"
              disabled={!contractAttachmentFields?.length || !allowed}
              type="submit"
              variant="primary"
              color="primary"
              loadingText="Laddar upp"
              onClick={(e) => {
                e.preventDefault();
                const apiCall = saveSignedContractAttachment(
                  municipalityId,
                  contractId,
                  contractAttachmentFields,
                  getValues('note')
                );
                apiCall
                  .then(() =>
                    getErrand(municipalityId, errand.id.toString())
                      .then((res) => setErrand(res.errand))
                      .then(() => {
                        toastMessage({
                          position: 'bottom',
                          closeable: false,
                          message: 'Bilagan sparades',
                          status: 'success',
                        });
                      })
                  )
                  .catch(() => {
                    toastMessage({
                      position: 'bottom',
                      closeable: false,
                      message: 'Något gick fel när bilagan sparades',
                      status: 'error',
                    });
                  });
              }}
            >
              Ladda upp
            </Button>
          </Modal.Footer>
        </FormControl>
      </Modal>

      <Button
        data-cy="add-attachment-button"
        disabled={isErrandLocked(errand) || !allowed || !contractId}
        color="vattjom"
        rightIcon={<Icon name="upload" size={16} />}
        inverted={allowed}
        size="sm"
        onClick={() => {
          openHandler();
        }}
      >
        Ladda upp signerat avtal (pdf)
      </Button>
    </>
  );
};
