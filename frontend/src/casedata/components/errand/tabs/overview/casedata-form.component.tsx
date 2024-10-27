import { SaveButtonComponent } from '@casedata/components/save-button/save-button.component';
import { Channels } from '@casedata/interfaces/channels';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase } from '@casedata/interfaces/errand-phase';
import { Priority } from '@casedata/interfaces/priority';
import { Stakeholder } from '@casedata/interfaces/stakeholder';
import { getCaseLabels, isErrandLocked, municipalityIds } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@common/contexts/app.context';
import {
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  LucideIcon as Icon,
  Input,
  Select,
  cx,
} from '@sk-web-gui/react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { UseFormReturn, useFormContext } from 'react-hook-form';
import { CasedataContactsComponent } from './casedata-contacts.component';

export interface CasedataFormModel {
  id: string;
  errandNumber: string;
  caseType: string;
  administrator?: Stakeholder;
  administratorName: string;
  priority: Priority;
  status: string;
  phase: ErrandPhase;
  supplementDueDate: string;
}

interface CasedataFormProps {
  errand?: IErrand;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  registeringNewErrand?: boolean;
  setFormIsValid: Dispatch<SetStateAction<boolean>>;
}

const CasedataForm: React.FC<CasedataFormProps> = ({
  errand,
  setUnsaved = () => {},
  update,
  registeringNewErrand,
  setFormIsValid,
  ...rest
}) => {
  const { administrators, municipalityId, setMunicipalityId, user } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectableAdmins, setSelectableAdmins] = useState<string[]>([]);
  const [selectableStatuses, setSelectableStatuses] = useState<string[]>([]);

  useEffect(() => {
    setSelectableAdmins(administrators.map((a) => `${a.firstName} ${a.lastName}`));
    setValue('channel', errand.channel);
    setValue('priority', errand.priority);
    setValue('status', errand.status);
    setValue('phase', errand.phase);
  }, [errand]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    trigger,
    formState,
    formState: { errors },
  }: UseFormReturn<IErrand, any, undefined> = useFormContext();

  useEffect(() => {
    setValue('municipalityId', municipalityId);
  }, [municipalityId]);

  useEffect(() => {
    setFormIsValid(formState.isValid);
  }, [formState]);

  const { caseType, priority } = watch();

  return (
    <div className="w-full py-24 px-32">
      <Divider.Section className="w-full flex justify-between items-center flex-wrap h-40">
        <div className="flex gap-sm items-center">
          <Icon name="circle-alert"></Icon>
          <h2 className="text-h4-sm md:text-h4-md">Om ärendet</h2>
        </div>
      </Divider.Section>
      <div className="mt-md flex flex-col">
        <div className="px-0 md:px-24 lg:px-40 pb-40 pt-0">
          <div className="flex flex-col md:flex-row gap-lg mb-lg">
            <FormControl id="channel" className="w-full">
              <FormLabel>Kanal</FormLabel>
              <Select
                {...register('channel')}
                readOnly
                disabled
                className="w-full text-dark-primary"
                variant="tertiary"
                size="sm"
                value={getValues('channel')}
                data-cy="channel-input"
                onChange={(e) => {}}
              >
                {Object.entries(Channels).map((c: [string, string]) => {
                  const id = c[0];
                  const label = c[1];
                  return (
                    <Select.Option
                      key={`channel-${id}`}
                      value={label}
                      className={cx(`cursor-pointer select-none relative py-4 pl-10 pr-4`)}
                    >
                      {label}
                    </Select.Option>
                  );
                })}
              </Select>

              {errors.channel && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{errors.channel?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
            <FormControl id="municipality" className="w-full">
              <FormLabel>Kommun</FormLabel>
              <Select
                {...register('municipalityId')}
                disabled
                data-cy="municipality-input"
                className="w-full text-dark-primary"
                variant="tertiary"
                size="sm"
                value={getValues('municipalityId')}
                onChange={(e) => {
                  setValue('municipalityId', e.currentTarget.value, { shouldDirty: true });
                  setMunicipalityId(e.currentTarget.value);
                }}
              >
                {municipalityIds.map((m) => {
                  const { id, label } = m;
                  return (
                    <Select.Option
                      key={`municipality-${id}`}
                      value={id}
                      className={cx(`cursor-pointer select-none relative py-4 pl-10 pr-4`)}
                    >
                      {label}
                    </Select.Option>
                  );
                })}
              </Select>
              {errors.municipalityId && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{errors.municipalityId?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          </div>

          <div className="flex flex-col md:flex-row gap-lg mb-lg">
            <Input type="hidden" {...register('phase')} />
            <Input type="hidden" {...register('status')} />
            <FormControl id="errandCategory" className="w-full" required>
              <FormLabel>Ärendetyp</FormLabel>
              <Input type="hidden" {...register('caseType')} />
              <Select
                disabled={isErrandLocked(errand)}
                data-cy="casetype-input"
                value={caseType}
                className="w-full text-dark-primary"
                variant="tertiary"
                size="sm"
                onChange={(e) => {
                  setValue('caseType', e.currentTarget.value, { shouldDirty: true });
                  trigger();
                }}
              >
                <Select.Option value="Välj ärendetyp">Välj ärendetyp</Select.Option>
                {Object.entries(getCaseLabels()).map(([key, label]: [string, string], index) => {
                  return (
                    <Select.Option
                      className={cx(`cursor-pointer select-none relative py-4 pl-10 pr-4`)}
                      key={`caseType-${key}`}
                      value={key}
                    >
                      {label}
                    </Select.Option>
                  );
                })}
              </Select>
              {errors.caseType && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{errors.caseType?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
            <FormControl id="priority" className="w-full">
              <FormLabel>Prioritet</FormLabel>
              <Select
                {...register('priority')}
                disabled={isErrandLocked(errand)}
                data-cy="priority-input"
                value={priority}
                className="w-full text-dark-primary"
                variant="tertiary"
                size="sm"
              >
                {Object.entries(Priority).map((c: [string, string]) => {
                  const id = c[0];
                  const label = c[1];
                  return (
                    <Select.Option
                      key={`priority-${id}`}
                      value={label}
                      className={cx(
                        `cursor-pointer select-none relative py-4 pl-10 pr-4
                                `
                      )}
                    >
                      {label}
                    </Select.Option>
                  );
                })}
              </Select>
              {errors.priority && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{'errors.priority?.message'}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          </div>

          <SaveButtonComponent
            errand={errand}
            registeringNewErrand={typeof errand?.id === 'undefined'}
            label={typeof errand?.id === 'undefined' ? 'Registrera' : 'Spara'}
            setUnsaved={setUnsaved}
            update={() => {}}
            verifyAndClose={function (): void {
              throw new Error('Function not implemented.');
            }}
          />
        </div>

        {errand?.id ? (
          <CasedataContactsComponent
            registeringNewErrand={typeof errand?.id === 'undefined'}
            setUnsaved={setUnsaved}
            update={() => {}}
          />
        ) : null}
      </div>
    </div>
  );
};

export default CasedataForm;
