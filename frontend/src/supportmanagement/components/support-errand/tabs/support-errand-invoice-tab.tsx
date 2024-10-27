import {
  ApiSupportErrand,
  getSupportErrandById,
  isSupportErrandLocked,
  SupportErrand,
  validateAction,
} from '@supportmanagement/services/support-errand-service';
import { useAppContext } from '@contexts/app.context';
import { FormControl, FormErrorMessage, FormLabel, Input, Button, RadioButton, useSnackbar } from '@sk-web-gui/react';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { User } from '@common/interfaces/user';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { updateSupportInvoice } from '@supportmanagement/services/support-invoice-service';

interface Invoice {
  id: string;
  invoiceType: string;
  hours: string;
  supervisor: string;
  referenceNumber: string;
}

let formSchema = yup.object({
  id: yup.string(),
  hours: yup.number().typeError('Ange ett giltigt värde'),
  supervisor: yup.string(),
  referenceNumber: yup.string(),
});

export const SupportErrandInvoiceTab: React.FC<{
  errand: ApiSupportErrand;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = (props) => {
  const {
    supportErrand,
    user,
    municipalityId,
    setSupportErrand,
  }: {
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: (e: SupportErrand) => void;
    user: User;
  } = useAppContext();

  const formControls = useForm<Invoice>({
    defaultValues: {
      id: props.errand.id,
      invoiceType: '',
      hours: '0',
      supervisor: '',
      referenceNumber: '',
    },
    resolver: yupResolver(formSchema),
  });

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = formControls;

  const toastMessage = useSnackbar();

  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(supportErrand, user);
    setAllowed(_a);
  }, [user, supportErrand]);

  const onSubmit = () => {
    const formData = getValues();

    const apiCall = updateSupportInvoice(supportErrand.id, municipalityId, formData);

    return apiCall
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Fakturan sparades',
          status: 'success',
        });
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
      })
      .catch(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när fakturan sparades',
          status: 'error',
        });
      });
  };

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Fakturering</h2>
        <span>Fyll i följande faktureringsunderlag.</span>

        <div className="my-md gap-xl">
          <FormControl>
            <FormLabel>Faktureringstyp</FormLabel>

            <RadioButton.Group className="block" data-cy="radio-button-group">
              <RadioButton
                data-cy="invoice-type-extra-payment-direct-deposit"
                className="mr-sm mb-sm w-full"
                name="direct-deposit"
                id="direct-deposit"
                value={'direct-deposit'}
                {...register('invoiceType')}
                disabled={isSupportErrandLocked(supportErrand) || !allowed}
              >
                Extra utbetalning - Direktinsättning
              </RadioButton>

              <RadioButton
                data-cy="invoice-type-extra-payment-system-deposit"
                className="mr-sm mb-sm w-full"
                name="system-deposit"
                id="system-deposit"
                value={'system-deposit'}
                {...register('invoiceType')}
                disabled={isSupportErrandLocked(supportErrand) || !allowed}
              >
                Extra utbetalning - Systemet
              </RadioButton>

              <RadioButton
                data-cy="invoice-type-manual-handling-salary-base"
                className="mr-sm mb-sm w-full"
                name="salary-base"
                id="salary-base"
                value={'salary-base'}
                {...register('invoiceType')}
                disabled={isSupportErrandLocked(supportErrand) || !allowed}
              >
                Manuell hantering - Löneunderlag
              </RadioButton>

              <RadioButton
                data-cy="invoice-type-extra-order"
                className="mr-sm w-full"
                name="extra-order"
                id="extra-order"
                value={'extra-order'}
                {...register('invoiceType')}
                disabled={isSupportErrandLocked(supportErrand) || !allowed}
              >
                Extra beställning
              </RadioButton>
            </RadioButton.Group>
          </FormControl>
        </div>

        <div className="my-sm gap-xl w-1/2">
          <FormControl id="category" className="w-full">
            <FormLabel>
              Antal <span className="font-normal">(st/h)</span>
            </FormLabel>
            <Input
              {...register('hours')}
              disabled={isSupportErrandLocked(supportErrand) || !allowed}
              data-cy="hours-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues('hours')}
              placeholder={'0'}
              onChange={(e) => {
                setValue('hours', e.target.value);
                trigger('hours');
              }}
            />
            {errors.hours ? (
              <div className="text-error">
                <FormErrorMessage>{errors.hours?.message}</FormErrorMessage>
              </div>
            ) : (
              <span className="text-small">Ange antal timmar</span>
            )}
          </FormControl>
        </div>

        <div className="flex mb-md gap-24">
          <div className="flex w-1/2">
            <FormControl id="supervisor" className="w-full">
              <FormLabel>Chef</FormLabel>
              <Input
                {...register('supervisor')}
                disabled={isSupportErrandLocked(supportErrand) || !allowed}
                data-cy="supervisor-input"
                className="w-full text-dark-primary"
                size="md"
                value={getValues('supervisor')}
                onChange={(e) => {
                  setValue('supervisor', e.target.value);
                  trigger('supervisor');
                }}
              />
              {errors.supervisor ? (
                <div className="text-error">
                  <FormErrorMessage>{errors.supervisor?.message}</FormErrorMessage>
                </div>
              ) : (
                <span className="text-small">Namn på den som ska faktureras</span>
              )}
            </FormControl>
          </div>
          <div className="flex w-1/2">
            <FormControl id="referenceNumber" className="w-full">
              <FormLabel>Referensnummer</FormLabel>
              <Input
                {...register('referenceNumber')}
                disabled={isSupportErrandLocked(supportErrand) || !allowed}
                data-cy="referenceNumber-input"
                className="w-full text-dark-primary"
                size="md"
                value={getValues().referenceNumber}
                onChange={(e) => {
                  setValue('referenceNumber', e.target.value);
                  trigger('referenceNumber');
                }}
              />
              {errors.referenceNumber ? (
                <div className="text-error">
                  <FormErrorMessage>{errors.referenceNumber?.message}</FormErrorMessage>
                </div>
              ) : (
                <span className="text-small">Referensnummer för den som får fakturan</span>
              )}
            </FormControl>
          </div>
        </div>

        <div>
          <Button
            className="mr-12"
            variant="secondary"
            disabled={isSupportErrandLocked(supportErrand) || !allowed}
            onClick={() => reset()}
          >
            Rensa formulär
          </Button>
          <Button disabled={isSupportErrandLocked(supportErrand) || !allowed} onClick={handleSubmit(onSubmit)}>
            Spara
          </Button>
        </div>
      </div>
    </div>
  );
};
