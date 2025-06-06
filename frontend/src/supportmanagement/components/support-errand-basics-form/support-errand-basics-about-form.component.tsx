import { useAppContext } from '@common/contexts/app.context';
import { Category, ContactReason } from '@common/data-contracts/supportmanagement/data-contracts';
import { User } from '@common/interfaces/user';
import { appConfig } from '@config/appconfig';
import { Checkbox, FormControl, FormErrorMessage, FormLabel, Select, Textarea, cx } from '@sk-web-gui/react';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  Channels,
  SupportErrand,
  defaultSupportErrandInformation,
  isSupportErrandLocked,
  supportErrandIsEmpty,
} from '@supportmanagement/services/support-errand-service';
import { SupportMetadata, SupportType, getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useEffect, useState } from 'react';
import { ThreeLevelCategorization } from './ThreeLevelCategorization';
import { useTranslation } from 'next-i18next';

export const SupportErrandBasicsAboutForm: React.FC<{
  supportErrand: SupportErrand;
  registeringNewErrand?: boolean;
  formControls: any;
}> = (props) => {
  const {
    supportMetadata,
  }: {
    supportMetadata: SupportMetadata;
    supportAttachments: SupportAttachment[];
    supportAdmins: SupportAdmin[];
    user: User;
  } = useAppContext();
  const { supportErrand } = props;
  const { t } = useTranslation();
  const [categoriesList, setCategoriesList] = useState<Category[]>();
  const [contactReasonList, setContactReasonList] = useState<ContactReason[]>();

  const [causeDescriptionIsOpen, setCauseDescriptionIsOpen] = useState(
    supportErrand.contactReasonDescription !== undefined
  );
  const [typesList, setTypesList] = useState<SupportType[]>();

  const {
    register,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = props.formControls;

  useEffect(() => {
    if (supportMetadata) {
      setCategoriesList(supportMetadata?.categories);
      setContactReasonList(supportMetadata?.contactReasons);
    } else {
      getSupportMetadata(defaultSupportErrandInformation.municipalityId).then((data) => {
        setCategoriesList(data.metadata?.categories);
        setContactReasonList(data.metadata?.contactReasons);
      });
    }
  }, [supportMetadata]);

  const { category, businessRelated } = watch();

  useEffect(() => {
    setTypesList(categoriesList?.find((c) => c.name === category)?.types || []);
  }, [category, categoriesList]);

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
          <div className="flex my-md gap-xl w-1/2">
            <FormControl id="category" className="w-full">
              <FormLabel>
                {t(
                  `common:basics_tab.orderType.${process.env.NEXT_PUBLIC_APPLICATION}`,
                  t('common:basics_tab.orderType.default')
                )}
              </FormLabel>
              <Select
                {...register('category')}
                disabled={isSupportErrandLocked(supportErrand)}
                data-cy="category-input"
                className="w-full text-dark-primary"
                variant="primary"
                size="md"
                value={getValues().category}
                onChange={(e) => {
                  setValue('category', e.currentTarget.value, { shouldDirty: true });
                  setValue('type', undefined, { shouldDirty: true });
                  trigger('category');
                  trigger('type');
                }}
              >
                <Select.Option value="">Välj ärendekategori</Select.Option>
                {categoriesList
                  ?.sort((a, b) => a.displayName.localeCompare(b.displayName))
                  .map((categori) => (
                    <Select.Option value={categori.name} key={`categori-${categori.name}`}>
                      {categori.displayName}
                    </Select.Option>
                  ))}
              </Select>
              {errors.category && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{errors.category?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          </div>
          <div className="flex my-md gap-xl w-1/2">
            <FormControl id="type" className="w-full">
              <FormLabel>Ärendetyp*</FormLabel>
              <Select
                {...register('type')}
                disabled={isSupportErrandLocked(supportErrand)}
                data-cy="type-input"
                className="w-full text-dark-primary"
                variant="primary"
                size="md"
                value={getValues().type}
                onChange={(e) => {
                  setValue('type', e.currentTarget.value, { shouldDirty: true });
                  trigger('type');
                }}
              >
                <Select.Option value="">Välj ärendetyp</Select.Option>
                {typesList?.map((type) => (
                  <Select.Option value={type.name} key={`type-${type.name}`}>
                    {type.displayName}
                  </Select.Option>
                ))}
              </Select>
              {errors.type && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{errors.type?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          </div>
        </div>
      ) : null}

      {appConfig.features.useThreeLevelCategorization ? (
        <div className="w-full flex gap-20">
          <ThreeLevelCategorization supportErrand={supportErrand} />
        </div>
      ) : null}

      {appConfig.features.useBusinessCase ? (
        <div className="flex gap-24">
          <FormControl id="iscompanyerrand">
            <Checkbox
              disabled={isSupportErrandLocked(supportErrand)}
              {...register('businessRelated')}
              checked={businessRelated ? true : false}
              onChange={() => {
                businessRelated === 'true' || businessRelated
                  ? setValue('businessRelated', false, { shouldDirty: true })
                  : setValue('businessRelated', true, { shouldDirty: true });
                trigger('businessRelated');
              }}
            >
              Företagsärende
            </Checkbox>
          </FormControl>
        </div>
      ) : null}

      <div className="flex my-24 gap-xl">
        <FormControl id="description" className="w-full">
          <FormLabel>Ärendebeskrivning</FormLabel>

          <Textarea
            disabled={isSupportErrandLocked(supportErrand)}
            className="block w-full text-[1.6rem] h-full"
            data-cy="description-input"
            {...register('description')}
            placeholder="Beskriv ärendet"
            rows={7}
            id="description"
            value={getValues().description}
          />
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
