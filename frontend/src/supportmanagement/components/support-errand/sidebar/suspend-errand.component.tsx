import { User } from '@common/interfaces/user';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  FormControl,
  FormLabel,
  LucideIcon as Icon,
  Input,
  Modal,
  Textarea,
  useSnackbar,
} from '@sk-web-gui/react';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  Status,
  SupportErrand,
  getSupportErrandById,
  setSuspension,
} from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import dayjs from 'dayjs';
import { useState } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';
import * as yup from 'yup';

const yupSuspendForm = yup.object().shape({
  date: yup.string().required('Datum är obligatoriskt'),
  comment: yup.string(),
});

export type RECIPIENT = 'DEPARTMENT' | 'EMAIL';

export interface SuspendFormProps {
  date: string;
  comment: string;
}

export const SuspendErrandComponent: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const {
    user,
    municipalityId,
    supportErrand,
    setSupportErrand,
    supportMetadata,
    supportAttachments,
  }: {
    user: User;
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: any;
    supportMetadata: SupportMetadata;
    supportAttachments: SupportAttachment[];
  } = useAppContext();
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState,
    trigger,
    formState: { errors },
  }: UseFormReturn<SuspendFormProps, any, undefined> = useForm({
    resolver: yupResolver(yupSuspendForm),
    defaultValues: { date: dayjs().add(30, 'day').format('YYYY-MM-DD'), comment: '' },
    mode: 'onChange',
  });

  const handleSuspendErrand = (data: SuspendFormProps) => {
    setIsLoading(true);
    setError(false);
    return setSuspension(supportErrand.id, municipalityId, Status.SUSPENDED, data.date, data.comment)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärendet parkerades',
          status: 'success',
        });
        setIsLoading(false);
        setShowModal(false);
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när ärendet skulle parkeras',
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  return (
    <>
      {!(supportErrand?.status === Status.PENDING || supportErrand?.status === Status.AWAITING_INTERNAL_RESPONSE) ? (
        <>
          <Button
            className="w-full"
            color="vattjom"
            data-cy="suspend-button"
            leftIcon={<Icon name="circle-pause" />}
            variant="secondary"
            disabled={disabled}
            onClick={() => setShowModal(true)}
          >
            Parkera ärende
          </Button>

          <Modal show={showModal} label="Parkera ärendet" className="w-[52rem]" onClose={() => setShowModal(false)}>
            <Modal.Content>
              <FormControl id="email" className="w-full" required>
                <FormLabel className="text-small">Sätt en påminnelse för när ärendet ska återupptas</FormLabel>
                <Input
                  data-cy="date-input"
                  type="date"
                  min={dayjs().format('YYYY-MM-DD')}
                  placeholder="Sätt en påminnelse för när ärendet ska återupptas"
                  aria-label="Sätt en påminnelse för när ärendet ska återupptas"
                  {...register('date')}
                />
              </FormControl>

              <FormControl id="comment" className="w-full">
                <FormLabel className="text-small">Lägg till en kommentar</FormLabel>
                <Textarea
                  className="block w-full text-[1.6rem] h-full"
                  data-cy="comment-input"
                  {...register('comment')}
                  placeholder="Lägg till en kommentar"
                  rows={7}
                  id="comment"
                />
              </FormControl>
            </Modal.Content>
            <Modal.Footer>
              <Button
                variant="primary"
                color="vattjom"
                disabled={isLoading || !formState.isValid || disabled}
                className="w-full"
                loading={isLoading}
                loadingText="Parkerar ärende"
                onClick={() => {
                  handleSuspendErrand(getValues());
                }}
              >
                Parkera ärende
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      ) : null}
    </>
  );
};
