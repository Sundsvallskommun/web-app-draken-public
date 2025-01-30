import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase, UiPhase } from '@casedata/interfaces/errand-phase';
import {
  appealErrand,
  getErrand,
  isErrandAdmin,
  isErrandLocked,
  saveErrand,
} from '@casedata/services/casedata-errand-service';
import { Admin } from '@common/services/user-service';
import { useAppContext } from '@contexts/app.context';
import {
  Button,
  ConfirmationDialogContextProvider,
  FormControl,
  FormLabel,
  Modal,
  Spinner,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import router from 'next/router';
import { useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

export const AppealButtonComponent: React.FC<{ disabled: boolean }> = (props) => {
  const {
    municipalityId,
    user,
    errand,
    setErrand,
    administrators,
    uiPhase,
  }: { municipalityId: string; user: any; errand: IErrand; setErrand: any; administrators: Admin[]; uiPhase: UiPhase } =
    useAppContext();

  const toastMessage = useSnackbar();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const saveConfirm = useConfirm();
  const {
    handleSubmit,
    register,
    control,
    watch,
    setValue,
    getValues,
    trigger,
    reset,
    formState,
    formState: { errors },
  }: UseFormReturn<IErrand, any, undefined> = useFormContext();

  const onSubmit = () => {
    return appealErrand(errand)
      .then(async (res) => {
        setIsLoading(false);
        if (!res.errandSuccessful) {
          throw new Error('Errand could not be registered');
        }

        const appealedErrand = await getErrand(municipalityId, res.errandId);
        console.log('Errand:', appealedErrand);
        setErrand(appealedErrand.errand);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärendet överklagat',
          status: 'success',
        });
        router.push(`/arende/${municipalityId}/${appealedErrand.errand.errandNumber}`);
        setIsLoading(false);
        return true;
      })
      .catch((e) => {
        console.error('Error when updating errand:', e);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när ärendet överklagat',
          status: 'error',
        });
        setIsLoading(false);
        return true;
      });
  };

  const handleClick = (errand) => {
    window.open(
      `${process.env.NEXT_PUBLIC_BASEPATH}/arende/${municipalityId}/${errand.relatesTo[0].errandNumber}`,
      '_blank'
    );
  };

  return isLoading ? (
    <Button disabled className="mt-16" variant="secondary" rightIcon={<Spinner size={2} />}>
      Överklaga ärendet
    </Button>
  ) : errand.relatesTo && errand.relatesTo.length > 0 && errand.relatesTo[0].errandId ? (
    <Button className="mt-16" variant="secondary" onClick={() => handleClick(errand)}>
      Visa relaterat ärende
    </Button>
  ) : (
    <Button
      className="mt-16"
      color="primary"
      variant="secondary"
      onClick={handleSubmit(() => {
        return saveConfirm
          .showConfirmation('Överklaga ärendet', 'Vill du överklaga ärendet?', 'Ja', 'Nej', 'info')
          .then((confirmed) => {
            if (confirmed) {
              setIsLoading(true);
              onSubmit();
            }
            return confirmed ? () => true : () => {};
          });
      })}
      disabled={props.disabled}
    >
      Överklaga ärendet
    </Button>
  );

  // <Modal
  //   label="Överklaga ärendet"
  //   show={modalAppealIsOpen}
  //   onClose={() => {
  //     setModalAppealIsOpen(false);
  //   }}
  //   className="min-w-[48rem]"
  // >
  //   <Modal.Content className="pb-0">
  //     <FormControl className="w-full">
  //       <FormLabel>
  //         Beskriv orsak till överklagan<span aria-hidden="true">*</span>
  //       </FormLabel>

  //       <small className="my-0 text-dark-secondary">Texten sparas som en tjänsteanteckning på ärendet.</small>
  //     </FormControl>
  //   </Modal.Content>
  //   <Modal.Footer>
  //     <Button
  //       variant="primary"
  //       color="vattjom"
  //       className="w-full mt-8"
  //       disabled={false}
  //       onClick={() => {
  //         setModalAppealIsOpen(false); //TODO: Add appeal function
  //       }}
  //     >
  //       Avsluta ärendet
  //     </Button>
  //   </Modal.Footer>
  // </Modal>
};
