import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { prettyTime } from '@common/services/helper-service';
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
import {
  customerIdentities,
  invoiceActivities,
  InvoiceFormModel,
  invoiceTypes,
  recordToFormModel,
} from '@supportmanagement/services/support-billing-service';
import NextLink from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CBillingRecord, CBillingRecordStatusEnum } from 'src/data-contracts/backend/data-contracts';
import * as yup from 'yup';

// export interface AttestationInvoiceFormModel {
//   id: string;
//   errandId: string;
//   manager: string;
//   referenceNumber: string;
//   customerId: string;
//   activity: string;
//   type: string;
//   quantity: string;
//   costPerUnit: string;
//   totalAmount: string;
//   registeredAt: string;
//   registeredBy: string;
//   modified: string;
//   attested: string;
//   status: string;
//   approvedBy?: string;
//   approved?: string;
// }

let formSchema = yup.object({
  id: yup.string(),
  costPerUnit: yup.number().typeError('Ange ett giltigt värde'),
  manager: yup.string().required('Fyll i chef'),
  referenceNumber: yup.string().required('Fyll i referensnummer'),
  errandId: yup.string().required('Fyll i ärende-id'),
  customerId: yup.string().required('Fyll i kundidentitet'),
  activity: yup.string().required('Fyll i aktivitet'),
  type: yup.string().required('Fyll i faktureringstyp'),
  quantity: yup.number().typeError('Ange ett giltigt värde').required('Fyll i antal timmar'),
  totalAmount: yup.number().typeError('Ange ett giltigt värde'),
  registeredBy: yup.string(),
  approvedBy: yup.string(),
  status: yup.string(),
});

export const AttestationInvoiceForm: React.FC<{
  setUnsaved?: (boolean) => void;
  update?: () => void;
  selectedrecord: CBillingRecord;
}> = (props) => {
  const {
    municipalityId,
    user,
  }: {
    municipalityId: string;
    user: User;
  } = useAppContext();

  const { selectedrecord } = props;
  const recordFormModel = recordToFormModel(selectedrecord);

  const toastMessage = useSnackbar();
  const [showChangeDecisionComponent, setShowDecisionComponent] = useState(false);
  const [invoiceError, setInvoiceError] = useState(false);

  const formControls = useForm<InvoiceFormModel>({
    defaultValues: recordFormModel,
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

    /* TODO Endpoint?
    updateSupportInvoice(recordFormModel.errandId, municipalityId, invoiceData)
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

  const ChangeAttestationDecisionComponent = (props: { status: CBillingRecordStatusEnum }) => {
    return (
      <div className="flex gap-md my-md">
        <Select
          className="w-full"
          disabled={props.status === CBillingRecordStatusEnum.INVOICED}
          value={props.status}
          onChange={(e) => {
            setValue('status', e.target.value, { shouldDirty: true });
            trigger('status');
          }}
        >
          <Select.Option value={CBillingRecordStatusEnum.NEW}>Inget beslut</Select.Option>
          <Select.Option value={CBillingRecordStatusEnum.APPROVED}>Godkänn</Select.Option>
          <Select.Option value={CBillingRecordStatusEnum.REJECTED}>Avböj</Select.Option>
          <Select.Option value={CBillingRecordStatusEnum.INVOICED}>Fakturerad</Select.Option>
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setShowDecisionComponent(false);
            setValue('status', recordFormModel.status);
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
              <NextLink href={`/arende/${municipalityId}/${'MISSING'}`} target="_blank" className="underline">
                recordFormModel?.errandId
              </NextLink>
            </Table.Column>
            <Table.Column>{prettyTime(selectedrecord.created)}</Table.Column>
            <Table.Column>{recordFormModel.registeredBy}</Table.Column>
            <Table.Column>{prettyTime(selectedrecord.modified)}</Table.Column>
          </Table.Row>
        </Table.Body>
      </Table>

      <div className="flex gap-md mt-16">
        <div className="my-sm w-1/2">
          <FormControl id="manager" className="w-full">
            <FormLabel>Chef</FormLabel>
            <Input
              {...register('manager')}
              data-cy="manager-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues().manager}
              onChange={(e) => {
                setValue('manager', e.target.value);
                trigger('manager');
              }}
            />
            {errors.manager && (
              <div className="text-error">
                <FormErrorMessage>{errors.manager?.message}</FormErrorMessage>
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
            <Select
              {...register('customerId')}
              data-cy="customerId-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues('customerId')}
              placeholder={'0'}
              onChange={(e) => {
                setValue('customerId', e.target.value);
                trigger('customerId');
              }}
            >
              {customerIdentities.map((identity) => (
                <Select.Option key={identity.customerId} value={identity.customerId}>
                  {identity.customerName}
                </Select.Option>
              ))}
            </Select>
            {errors.customerId && (
              <div className="text-error">
                <FormErrorMessage>{errors.customerId?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>

        <div className="w-1/2">
          <FormControl id="category" className="w-full">
            <FormLabel>Aktivitet</FormLabel>
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
              {invoiceActivities.map((activity) => (
                <Select.Option key={activity.id} value={activity.value}>
                  {activity.displayName}
                </Select.Option>
              ))}
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
            <div className="flex justify-between flex-wrap w-full">
              {invoiceTypes.map((invoiceType) => (
                <div className="w-1/2" key={invoiceType.key}>
                  <RadioButton
                    data-cy={`invoice-type-${invoiceType}`}
                    className="mr-lg mb-sm whitespace-nowrap"
                    name={invoiceType.key}
                    id={invoiceType.key}
                    value={invoiceType.displayName}
                    {...register('type')}
                    checked={getValues().type === invoiceType.displayName}
                  >
                    {invoiceType.displayName}
                  </RadioButton>
                </div>
              ))}
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
              type="number"
              step={0.01}
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
          <FormControl id="costPerUnit" className="w-full">
            <FormLabel>Timpris</FormLabel>
            <Input
              {...register('costPerUnit')}
              data-cy="costPerUnit-input"
              className="w-full text-dark-primary"
              size="md"
              value={getValues().costPerUnit}
              placeholder={'0'}
              onChange={(e) => {
                setValue('costPerUnit', e.target.value);
                trigger('costPerUnit');
              }}
              disabled
            />
            {errors.costPerUnit && (
              <div className="text-error">
                <FormErrorMessage>{errors.costPerUnit?.message}</FormErrorMessage>
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
              // value={getValues().totalAmount.toString()}
              // placeholder={'0'}
              // onChange={(e) => {
              //   setValue('totalAmount', parseFloat(e.target.value));
              //   trigger('totalAmount');
              // }}
              // disabled
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

      {recordFormModel.status === 'NONE' ? (
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
      ) : recordFormModel.status === 'APPROVED' ? (
        showChangeDecisionComponent ? (
          <ChangeAttestationDecisionComponent status={getValues().status as CBillingRecordStatusEnum} />
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
                <b>Attesterad av:</b> {selectedrecord.approvedBy}, {prettyTime(selectedrecord.approved)}
              </span>
            </span>
          </div>
        )
      ) : showChangeDecisionComponent ? (
        <ChangeAttestationDecisionComponent status={getValues().status as CBillingRecordStatusEnum} />
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
              <b>Attesterad av:</b> {selectedrecord.approvedBy}, {prettyTime(selectedrecord.approved)}
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
