import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  RadioButton,
  Select,
  Table,
  useSnackbar,
} from '@sk-web-gui/react';
import { AttestationInvoiceRequest } from '@supportmanagement/services/support-invoice-service';
import NextLink from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

export interface AttestationInvoiceFormModel {
  id: string;
  errandId: string;
  supervisor: string;
  referenceNumber: string;
  client: string;
  activity: string;
  type: string;
  quantity: string;
  amount: string;
  totalAmount: string;
  registeredAt: string;
  registeredBy: string;
  updatedAt: string;
  attested: string;
  status: string;
  approvedBy?: string;
  approved?: string;
}

let formSchema = yup
  .object({
    id: yup.string(),
    supervisor: yup.string(),
    referenceNumber: yup.string(),
    client: yup.string(),
    activity: yup.string(),
    type: yup.string(),
    quantity: yup.string(),
    totalAmount: yup.string(),
    amount: yup.string(),
  })
  .required();

export const AttestationInvoiceForm: React.FC<{
  setUnsaved?: (boolean) => void;
  update?: () => void;
  selectedInvoice: AttestationInvoiceFormModel;
}> = (props) => {
  const {
    municipalityId,
    user,
  }: {
    municipalityId: string;
    user: User;
  } = useAppContext();

  const { selectedInvoice } = props;

  const toastMessage = useSnackbar();
  const [showChangeDecisionComponent, setShowDecisionComponent] = useState(false);
  const [invoiceError, setInvoiceError] = useState(false);

  const formControls = useForm<AttestationInvoiceFormModel>({
    defaultValues: {
      id: selectedInvoice.id,
      errandId: selectedInvoice.errandId,
      supervisor: selectedInvoice.supervisor,
      referenceNumber: selectedInvoice.referenceNumber,
      client: selectedInvoice.client,
      activity: selectedInvoice.activity,
      type: selectedInvoice.type,
      quantity: selectedInvoice.quantity,
      amount: selectedInvoice.amount,
      totalAmount: selectedInvoice.totalAmount,
      registeredAt: selectedInvoice.registeredAt,
      registeredBy: selectedInvoice.registeredBy,
      updatedAt: selectedInvoice.updatedAt,
      attested: selectedInvoice.attested,
      status: selectedInvoice.status,
    },
    resolver: yupResolver(formSchema),
    mode: 'onChange',
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    trigger,
    formState,
    getValues,
    setValue,
    clearErrors,
    formState: { errors, isDirty },
  } = formControls;

  const send: () => void = async () => {
    setInvoiceError(false);
    const data = getValues();
    const invoiceData: AttestationInvoiceRequest = {
      supervisor: data.supervisor,
      referenceNumber: data.referenceNumber,
      client: data.client,
      activity: data.activity,
      type: data.type,
      quantity: data.quantity,
      amount: data.amount,
      totalAmount: data.totalAmount,
      registeredAt: data.registeredAt,
      registeredBy: data.registeredBy,
      updatedAt: data.updatedAt,
      attested: data.attested,
      status: data.status,
    };

    /* TODO Endpoint?
    updateSupportInvoice(selectedInvoice.errandId, municipalityId, invoiceData)
      .then((success) => {
        if (!success) {
          throw new Error('');
        }

        setTimeout(() => {
          props.setUnsaved(false);
          clearErrors();
        }, 0);
        setTimeout(() => {
          props.update();
        }, 500);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Fakturan sparades',
          status: 'success',
        });
      })
      .catch((e) => {
        console.error(e);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när fakturan skulle sparas',
          status: 'error',
        });
      });*/
  };

  const ChangeAttestationDecisionComponent = () => {
    return (
      <div className="flex gap-md my-md">
        <Select
          className="w-full"
          value={getValues().status}
          onChange={(e) => {
            setValue('status', e.target.value, { shouldDirty: true });
            trigger('status');
          }}
        >
          <Select.Option value="NONE">Inget beslut</Select.Option>
          <Select.Option value="DENIED">Avböj</Select.Option>
          <Select.Option value="APPROVED">Godkänn</Select.Option>
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setShowDecisionComponent(false);
            setValue('status', selectedInvoice.status);
          }}
        >
          Avbryt
        </Button>
        <Button disabled={!isDirty}>Spara beslut</Button>
      </div>
    );
  };

  return (
    <div className="px-40 my-lg gap-24">
      <input type="hidden" {...register('id')} />

      <Table background>
        <Table.Header>
          <Table.HeaderColumn>Ärende</Table.HeaderColumn>
          <Table.HeaderColumn>Registrerad</Table.HeaderColumn>
          <Table.HeaderColumn>Av</Table.HeaderColumn>
          <Table.HeaderColumn>Uppdaterad</Table.HeaderColumn>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Column>
              <NextLink
                href={`/arende/${municipalityId}/${selectedInvoice.errandId}`}
                target="_blank"
                className="underline"
              >
                {selectedInvoice?.errandId}
              </NextLink>
            </Table.Column>
            <Table.Column>{selectedInvoice.registeredAt}</Table.Column>
            <Table.Column>{selectedInvoice.registeredBy}</Table.Column>
            <Table.Column>{selectedInvoice.updatedAt}</Table.Column>
          </Table.Row>
        </Table.Body>
      </Table>

      <div className="flex gap-md mt-16">
        <div className="my-sm w-1/2">
          <FormControl id="supervisor" className="w-full">
            <FormLabel>Chef</FormLabel>
            <Input
              {...register('supervisor')}
              data-cy="supervisor-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues().supervisor}
              onChange={(e) => {
                setValue('supervisor', e.target.value);
                trigger('supervisor');
              }}
            />
            {errors.supervisor && (
              <div className="text-error">
                <FormErrorMessage>{errors.supervisor?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>

        <div className="my-sm gap-xl w-1/2">
          <FormControl id="category" className="w-full">
            <FormLabel>Referensnummer</FormLabel>
            <Input
              {...register('referenceNumber')}
              data-cy="referenceNumber-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues().referenceNumber}
              placeholder={'0'}
              onChange={(e) => {
                setValue('referenceNumber', e.target.value);
                trigger('referenceNumber');
              }}
            />
            {errors.referenceNumber && (
              <div className="text-error">
                <FormErrorMessage>{errors.referenceNumber?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>
      </div>

      <div className="flex gap-md mt-8 mb-lg">
        <div className="w-1/2">
          <FormControl id="category" className="w-full">
            <FormLabel>Kundidentitet</FormLabel>
            {/* TODO Missing select options */}
            <Select
              {...register('client')}
              data-cy="client-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues('client')}
              placeholder={'0'}
              onChange={(e) => {
                setValue('client', e.target.value);
                trigger('client');
              }}
            >
              {' '}
            </Select>
            {errors.client && (
              <div className="text-error">
                <FormErrorMessage>{errors.client?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>

        <div className="w-1/2">
          <FormControl id="category" className="w-full">
            <FormLabel>Aktivitet</FormLabel>
            {/* TODO Missing select options */}
            <Select
              {...register('activity')}
              data-cy="activity-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues('activity')}
              placeholder={'0'}
              onChange={(e) => {
                setValue('activity', e.target.value);
                trigger('activity');
              }}
            >
              {' '}
            </Select>
            {errors.activity && (
              <div className="text-error">
                <FormErrorMessage>{errors.activity?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>
      </div>

      <Divider />

      <div className="my-lg gap-xl">
        <FormControl>
          <FormLabel>Faktureringstyp</FormLabel>

          <RadioButton.Group className="block w-full" data-cy="radio-button-group" inline={true}>
            <div className="flex justify-between w-full">
              <div>
                <RadioButton
                  data-cy="invoice-type-extra-payment-direct-deposit"
                  className="mr-lg mb-sm"
                  name="direct-deposit"
                  id="direct-deposit"
                  value={'Extra utbetalning - Direktinsättning'}
                  {...register('type')}
                  checked={getValues().type === 'Extra utbetalning - Direktinsättning'}
                >
                  Extra utbetalning - Direktinsättning
                </RadioButton>

                <RadioButton
                  data-cy="invoice-type-extra-payment-system-deposit"
                  className="mr-sm mb-sm"
                  name="system-deposit"
                  id="system-deposit"
                  value={'Extra utbetalning - Systemet'}
                  {...register('type')}
                  checked={getValues().type === 'Extra utbetalning - Systemet'}
                >
                  Extra utbetalning - Systemet
                </RadioButton>
              </div>

              <div>
                <RadioButton
                  data-cy="invoice-type-manual-handling-salary-base"
                  className="mr-lg mb-sm"
                  name="salary-base"
                  id="salary-base"
                  value={'Manuell hantering - Löneunderlag'}
                  {...register('type')}
                  checked={getValues().type === 'Manuell hantering - Löneunderlag'}
                >
                  Manuell hantering - Löneunderlag
                </RadioButton>

                <RadioButton
                  data-cy="invoice-type-extra-order"
                  className="mr-sm"
                  name="extra-order"
                  id="extra-order"
                  value={'Extra beställning'}
                  {...register('type')}
                  checked={getValues().type === 'Extra beställning'}
                >
                  Extra beställning
                </RadioButton>
              </div>
            </div>
          </RadioButton.Group>
        </FormControl>
      </div>

      <div className="flex gap-md mt-16">
        <div className="my-sm w-1/2">
          <FormControl id="quantity" className="w-full">
            <FormLabel>Antal timmar</FormLabel>
            <Input
              {...register('quantity')}
              data-cy="quantity-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues().quantity}
              onChange={(e) => {
                setValue('quantity', e.target.value);
                trigger('quantity');
              }}
            />
            {errors.quantity && (
              <div className="text-error">
                <FormErrorMessage>{errors.quantity?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>

        <div className="my-sm gap-xl w-1/2">
          <FormControl id="amount" className="w-full">
            <FormLabel>Timpris</FormLabel>
            <Input
              {...register('amount')}
              data-cy="amount-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues().amount}
              placeholder={'0'}
              onChange={(e) => {
                setValue('amount', e.target.value);
                trigger('amount');
              }}
              disabled
            />
            {errors.amount && (
              <div className="text-error">
                <FormErrorMessage>{errors.amount?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>
      </div>

      <div className="flex gap-md mt-16 mb-lg">
        <div className="my-sm w-1/2">
          <FormControl id="totalAmount" className="w-full">
            <FormLabel>Kostnad totalt</FormLabel>
            <Input
              {...register('totalAmount')}
              data-cy="totalAmount-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues().totalAmount}
              placeholder={'0'}
              onChange={(e) => {
                setValue('totalAmount', e.target.value);
                trigger('totalAmount');
              }}
              disabled
            />
            {errors.totalAmount && (
              <div className="text-error">
                <FormErrorMessage>{errors.totalAmount?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>

        <div className="my-sm gap-xl w-1/2">
          <FormControl id="quantity" className="w-full">
            <FormLabel>Utvecklingskostnad</FormLabel>
            <Input
              {...register('quantity')}
              data-cy="quantity-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues('quantity')}
              placeholder={'0'}
              onChange={(e) => {
                setValue('quantity', e.target.value);
                trigger('quantity');
              }}
              disabled
            />
            {errors.quantity && (
              <div className="text-error">
                <FormErrorMessage>{errors.quantity?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>
      </div>

      <Divider />

      {selectedInvoice.status === 'NONE' ? (
        <div className="flex justify-between gap-16 w-full my-lg">
          <div>
            <Button variant="secondary" onClick={send}>
              Spara
            </Button>
          </div>
          <div className="justify-end">
            <Button variant="primary" color="error" className="mr-16">
              Avslå
            </Button>
            <Button variant="primary" color="gronsta">
              Godkänn
            </Button>
          </div>
        </div>
      ) : selectedInvoice.status === 'APPROVED' ? (
        showChangeDecisionComponent ? (
          <ChangeAttestationDecisionComponent />
        ) : (
          <div>
            <div className="pt-16 gap-md flex justify-end">
              <Button inverted variant="primary" color="gronsta">
                <LucideIcon name="check" /> Godkänd
              </Button>
              <Button variant="link" className="text-black" onClick={() => setShowDecisionComponent(true)}>
                Ändra beslut
              </Button>
            </div>
            <span className="flex justify-end my-md">
              <span className="text-small">
                <b>Attesterad av:</b> {selectedInvoice.approvedBy}, {selectedInvoice.approved}
              </span>
            </span>
          </div>
        )
      ) : showChangeDecisionComponent ? (
        <ChangeAttestationDecisionComponent />
      ) : (
        <div>
          <div className="pt-16 gap-md flex justify-end">
            <Button inverted variant="primary" color="error">
              <LucideIcon name="thumbs-down" /> Avslag
            </Button>
            <Button variant="link" className="text-black" onClick={() => setShowDecisionComponent(true)}>
              Ändra beslut
            </Button>
          </div>
          <span className="flex justify-end my-md">
            <span className="text-small">
              <b>Attesterad av:</b> {selectedInvoice.approvedBy}, {selectedInvoice.approved}
            </span>
          </span>
        </div>
      )}
      <div className="my-sm">
        {invoiceError && (
          <FormErrorMessage className="text-error">Något gick fel när fakturan skulle sparas</FormErrorMessage>
        )}
      </div>
    </div>
  );
};
