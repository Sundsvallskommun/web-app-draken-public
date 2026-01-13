import { useAppContext } from '@common/contexts/app.context';
import { Category, ContactReason } from '@common/data-contracts/supportmanagement/data-contracts';
import { appConfig } from '@config/appconfig';
import { Checkbox, FormControl, FormErrorMessage, FormLabel, Select, Textarea, cx } from '@sk-web-gui/react';
import {
  Channels,
  ContactChannelType,
  SupportErrand,
  defaultSupportErrandInformation,
  isSupportErrandLocked,
  supportErrandIsEmpty,
} from '@supportmanagement/services/support-errand-service';
import { SupportMetadata, SupportType, getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { UseFormReturn, useFormContext } from 'react-hook-form';
import { ThreeLevelCategorization } from './ThreeLevelCategorization';
import { TwoLevelCategorization } from './TwoLevelCategorization';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

export const SupportErrandBasicsAboutForm: React.FC<{
  supportErrand: SupportErrand;
  registeringNewErrand?: boolean;
}> = (props) => {
  const {
    supportMetadata,
  }: {
    supportMetadata: SupportMetadata;
  } = useAppContext();
  const { supportErrand } = props;
  const { t } = useTranslation();

  const [contactReasonList, setContactReasonList] = useState<ContactReason[]>();
  const [causeDescriptionIsOpen, setCauseDescriptionIsOpen] = useState(
    supportErrand.contactReasonDescription !== undefined
  );

  const formControls: UseFormReturn<SupportErrand> = useFormContext();

  const {
    register,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = formControls;

  const { description } = watch();
  const userHasEditedDescription = useRef(false);

  // Reset the edit flag when errand changes (new errand loaded)
  useEffect(() => {
    userHasEditedDescription.current = false;
  }, [supportErrand.id]);

  useEffect(() => {
    if (supportMetadata) {
      setContactReasonList(supportMetadata?.contactReasons);
    } else {
      getSupportMetadata(defaultSupportErrandInformation.municipalityId).then((data) => {
        setContactReasonList(data.metadata?.contactReasons);
      });
    }
  }, [supportMetadata]);

  const checked = document.querySelector('#causecheckbox:checked') !== null;

  return (
    <>
      <input type="hidden" {...register('id')} />
      {supportErrand?.title !== 'Empty errand' && !supportErrandIsEmpty(supportErrand) ? (
        <FormControl id="subject-line">
          <FormLabel>Ämnesrad</FormLabel>
          <p>{supportErrand.title}</p>
        </FormControl>
      ) : null}

      {appConfig.features.useTwoLevelCategorization ? (
        <div className="flex gap-24">
          <TwoLevelCategorization />
        </div>
      ) : null}

      {appConfig.features.useThreeLevelCategorization ? (
        <div className="w-full flex gap-20">
          <ThreeLevelCategorization supportErrand={supportErrand} supportMetadata={supportMetadata} />
        </div>
      ) : null}

      {appConfig.features.useBusinessCase ? (
        <div className="flex gap-24">
          <FormControl id="iscompanyerrand">
            <Checkbox disabled={isSupportErrandLocked(supportErrand)} {...register('businessRelated')}>
              Företagsärende
            </Checkbox>
          </FormControl>
        </div>
      ) : null}

      <div className="flex my-24 gap-xl">
        <FormControl id="description" className="w-full" data-cy="errand-description-richtext-wrapper">
          <FormLabel>Ärendebeskrivning</FormLabel>
          <div onFocusCapture={() => { userHasEditedDescription.current = true; }}>
            <TextEditor
              className="w-full h-[15rem] case-description-editor"
              readOnly={isSupportErrandLocked(supportErrand) || supportErrand.channel === ContactChannelType.EMAIL}
              disableToolbar
              onChange={(e) => {
                const newValue = e.target.value.markup;
                // Only mark as dirty if user has actually interacted with the editor
                setValue('description', newValue, { shouldDirty: userHasEditedDescription.current });
              }}
              value={{ markup: description }}
            />
          </div>
        </FormControl>
      </div>

      <div className="flex gap-24">
        {appConfig.features.useReasonForContact ? (
          <div className="flex gap-xl w-1/2">
            <FormControl id="cause" className="w-full">
              <FormLabel>
                {t(
                  `common:basics_tab.contactReason.${process.env.NEXT_PUBLIC_APPLICATION}`,
                  t('common:basics_tab.contactReason.default')
                )}
              </FormLabel>
              <Select
                {...register('contactReason')}
                disabled={isSupportErrandLocked(supportErrand)}
                data-cy="contactReason-input"
                className="w-full text-dark-primary"
                variant="primary"
                size="md"
                value={getValues().contactReason}
                onChange={(e) => {
                  setValue('contactReason', e.currentTarget.value, { shouldDirty: true });
                  trigger('contactReason');
                }}
              >
                <Select.Option value="">Välj orsak</Select.Option>
                {contactReasonList
                  ?.sort((a, b) => a.reason.localeCompare(b.reason))
                  .map((reason: ContactReason) => {
                    return (
                      <Select.Option value={reason.reason} key={`reason-${reason.reason}`}>
                        {reason.reason}
                      </Select.Option>
                    );
                  })}
              </Select>
              {errors.category && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{errors.category?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          </div>
        ) : null}

        <div className="flex gap-xl w-1/2">
          <FormControl id="channel" className="w-full">
            <FormLabel>Inkom via*</FormLabel>
            <Select
              {...register('channel')}
              disabled={isSupportErrandLocked(supportErrand)}
              data-cy="channel-input"
              className="w-full text-dark-primary"
              variant="primary"
              size="md"
              value={getValues().channel}
              onChange={(e) => {
                setValue('channel', e.currentTarget.value, { shouldDirty: true });
                trigger('channel');
              }}
            >
              {Object.entries(Channels).map((c: [string, string]) => {
                const id = c[0];
                const label = c[1];
                return (
                  <Select.Option
                    key={`channel-${id}`}
                    value={id}
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
        </div>
      </div>

      {appConfig.features.useExplanationOfTheCause ? (
        <div className="w-full mt-md mb-lg">
          <Checkbox
            id="causecheckbox"
            disabled={isSupportErrandLocked(supportErrand)}
            defaultChecked={supportErrand.contactReasonDescription !== undefined}
            data-cy="show-contactReasonDescription-input"
            className="w-full"
            onClick={() => (checked ? setCauseDescriptionIsOpen(false) : setCauseDescriptionIsOpen(true))}
          >
            {t(`common:basics_tab.cause_description.description_${process.env.NEXT_PUBLIC_APPLICATION}`)}
          </Checkbox>
          {causeDescriptionIsOpen ? (
            <FormControl id="causedescription" className="w-full mt-lg">
              <FormLabel>{t('common:basics_tab.cause_description.title')}</FormLabel>
              <Textarea
                data-cy="contactReasonDescription-input"
                disabled={isSupportErrandLocked(supportErrand)}
                className="block w-full text-[1.6rem] h-full"
                value={getValues().contactReasonDescription}
                {...register('contactReasonDescription')}
                placeholder="Beskriv orsaken"
                rows={7}
                id="causedescription"
              />
            </FormControl>
          ) : (
            <></>
          )}
        </div>
      ) : null}
    </>
  );
};
