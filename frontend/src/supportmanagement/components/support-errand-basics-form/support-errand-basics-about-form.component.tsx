import { useAppContext } from '@common/contexts/app.context';
import { Category, ContactReason } from '@common/data-contracts/supportmanagement/data-contracts';
import { User } from '@common/interfaces/user';
import { isIK, isKA, isKC, isLOP } from '@common/services/application-service';
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

export const SupportErrandBasicsAboutForm: React.FC<{
  supportErrand: SupportErrand;
  registeringNewErrand?: boolean;
  formControls: any;
}> = (props) => {
  const {
    supportMetadata,
    user,
  }: {
    supportMetadata: SupportMetadata;
    supportAttachments: SupportAttachment[];
    supportAdmins: SupportAdmin[];
    user: User;
  } = useAppContext();
  const { supportErrand } = props;
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
    formState,
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

      {isKC() ? (
        <div className="flex gap-24">
          <div className="flex my-md gap-xl w-1/2">
            <FormControl id="category" className="w-full">
              <FormLabel>{isKC() ? 'Verksamhet' : 'Ärendekategori'}*</FormLabel>
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
      ) : isLOP() || isIK() || isKA() ? (
        <div className="w-full flex gap-20">
          <ThreeLevelCategorization supportErrand={supportErrand} />
        </div>
      ) : null}

      {isKC() && (
        <div className="flex gap-24">
          <FormControl id="iscompanyerrand">
            <Checkbox
              disabled={isSupportErrandLocked(supportErrand)}
              {...register('businessRelated')}
              checked={businessRelated ? true : false}
              onChange={(e) => {
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
      )}

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
        {!isLOP() && !isIK() && (
          <div className="flex gap-xl w-1/2">
            <FormControl id="cause" className="w-full">
              <FormLabel>Orsak till kontakt</FormLabel>
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
        )}
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
      {!isLOP() && !isIK() && (
        <div className="w-full mt-md mb-lg">
          {/* TO DO: missing data from API. needs implementation */}
          <Checkbox
            id="causecheckbox"
            disabled={isSupportErrandLocked(supportErrand)}
            defaultChecked={supportErrand.contactReasonDescription !== undefined}
            data-cy="show-contactReasonDescription-input"
            className="w-full"
            onClick={() => (checked ? setCauseDescriptionIsOpen(false) : setCauseDescriptionIsOpen(true))}
          >
            Lägg till en orsaksbeskrivning
          </Checkbox>
          {causeDescriptionIsOpen ? (
            <FormControl id="causedescription" className="w-full mt-lg">
              <FormLabel>Orsaksbeskrivning</FormLabel>
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
      )}
    </>
  );
};
