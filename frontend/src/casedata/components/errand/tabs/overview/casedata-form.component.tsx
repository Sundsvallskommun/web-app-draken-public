import { CaseTypesHiddenFromRegistration } from '@casedata/interfaces/case-type';
import { Channels } from '@casedata/interfaces/channels';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase } from '@casedata/interfaces/errand-phase';
import { Priority } from '@casedata/interfaces/priority';
import { Stakeholder } from '@casedata/interfaces/stakeholder';
import { defaultMunicipality, getCaseLabels, isErrandLocked } from '@casedata/services/casedata-errand-service';
import { LinkedErrandsDisclosure } from '@common/components/linked-errands-disclosure/linked-errands-disclosure.component';
import { useAppContext } from '@common/contexts/app.context';
import { appConfig } from '@config/appconfig';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Disclosure, FormControl, FormErrorMessage, FormLabel, Input, Select, cx } from '@sk-web-gui/react';
import { Dispatch, SetStateAction, useEffect } from 'react';
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
  registeringNewErrand?: boolean;
}

const CasedataForm: React.FC<CasedataFormProps> = (registeringNewErrand) => {
  const { setMunicipalityId, errand, setUnsavedChanges } = useAppContext();

  const {
    register,
    watch,
    setValue,
    getValues,
    trigger,
    formState,
    formState: { errors },
  }: UseFormReturn<IErrand, any, undefined> = useFormContext();

  const { caseType, priority } = watch();
  const caseTypesHiddenFromRegistation = Object.keys(CaseTypesHiddenFromRegistration);

  return (
    <>
      <Disclosure variant="alt" header="Om ärendet" icon={<LucideIcon name="circle-alert" />} initalOpen={true}>
        <div className="px-0 pt-0">
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
                data-cy="municipality-input"
                disabled={isErrandLocked(errand)}
                className="w-full text-dark-primary"
                variant="tertiary"
                size="sm"
                value={getValues('municipalityId')}
                onChange={(e) => {
                  setValue('municipalityId', e.currentTarget.value, { shouldDirty: true });
                  setMunicipalityId(e.currentTarget.value);
                }}
              >
                <Select.Option
                  key={`municipality-${defaultMunicipality.id}`}
                  value={defaultMunicipality.id}
                  className={cx(`cursor-pointer select-none relative py-4 pl-10 pr-4`)}
                >
                  {defaultMunicipality.label}
                </Select.Option>
              </Select>
              {errors.municipalityId && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{errors.municipalityId?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          </div>

          <div className="flex flex-col md:flex-row gap-lg mb-lg">
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
                {Object.entries(getCaseLabels())
                  .filter(([key]) => !caseTypesHiddenFromRegistation.includes(key))
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([key, label]: [string, string], index) => {
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
                      className={cx(`cursor-pointer select-none relative py-4 pl-10 pr-4`)}
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
        </div>
      </Disclosure>
      {!registeringNewErrand && <CasedataContactsComponent setUnsaved={setUnsavedChanges} update={() => {}} />}
      {!registeringNewErrand && appConfig.features.useRelations && <LinkedErrandsDisclosure errand={errand} />}
    </>
  );
};

export default CasedataForm;
