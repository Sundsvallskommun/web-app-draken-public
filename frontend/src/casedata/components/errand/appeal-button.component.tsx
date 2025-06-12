import { IErrand } from '@casedata/interfaces/errand';
import { UiPhase } from '@casedata/interfaces/errand-phase';
import { appealErrand, getErrand } from '@casedata/services/casedata-errand-service';
import { Admin } from '@common/services/user-service';
import { useAppContext } from '@contexts/app.context';
import { Button, Spinner, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

export const AppealButtonComponent: React.FC<{ disabled: boolean }> = (props) => {
  const {
    municipalityId,
    errand,
    setErrand,
  }: { municipalityId: string; user: any; errand: IErrand; setErrand: any; administrators: Admin[]; uiPhase: UiPhase } =
    useAppContext();

  const toastMessage = useSnackbar();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const saveConfirm = useConfirm();
  const router = useRouter();
  const {
    handleSubmit,
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
        if (!appealedErrand || !appealedErrand.errand) {
          throw new Error('Failed to fetch the appealed errand');
        }
        setErrand(appealedErrand.errand, () => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Överklagan registrerad',
            status: 'success',
          });
        });
        router.replace(`/arende/${municipalityId}/${appealedErrand.errand.errandNumber}`);
        setIsLoading(false);
        return true;
      })
      .catch((e) => {
        console.error('Error when updating errand:', e);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när överklagan skulle registreras',
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
      Registrera överklagan
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
          .showConfirmation('Registrera överklagan', 'Vill du registrera överklagan?', 'Ja', 'Nej', 'info')
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
      Registrera överklagan
    </Button>
  );
};
