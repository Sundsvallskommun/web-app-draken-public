import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { PriorityComponent } from '@common/components/priority/priority.component';
import { appConfig } from '@config/appconfig';
import { useCasedataStore } from '@stores/index';
import { Fragment } from 'react';
import { estateToText } from './utils/estate-text';

export const CasedataMetadataBand: React.FC = () => {
  const errand = useCasedataStore((s) => s.errand);

  if (!errand?.id) return null;

  return (
    <div className="rounded-cards">
      <div className="flex gap-x-32 gap-y-8 bg-background-color-mixin-1 rounded-button p-md border">
        <div className="pr-sm">
          <div data-cy="errandStatusLabel" className="font-bold">
            Ärendestatus
          </div>
          <div data-cy="errandStatus">{errand?.status?.statusType}</div>
        </div>
        <div className="pr-sm">
          <div className="font-bold" data-cy="errandPriorityLabel">
            Prioritet
          </div>
          <div>
            <span className="flex gap-sm items-center">
              <PriorityComponent priority={errand?.priority} />
            </span>
          </div>
        </div>

        <div className="pr-sm">
          <div data-cy="errandRegisteredLabel" className="font-bold">
            Registrerat
          </div>
          <div data-cy="errandRegistered">{errand?.created}</div>
        </div>
        <div className="pr-sm">
          <div className="font-bold" data-cy="errandStakeholderLabel">
            Ärendeägare
          </div>
          <div data-cy="errandStakeholder">
            {(() => {
              const owner = getOwnerStakeholder(errand);
              if (!owner) return '(saknas)';
              if (owner.firstName && owner.lastName) {
                return `${owner.firstName} ${owner.lastName}`;
              }
              if (owner.organizationName) {
                return owner.organizationName;
              }
              return '(saknas)';
            })()}
          </div>
        </div>

        {appConfig.features.useFacilities ? (
          <div className="pr-sm w-[40%]">
            <div className="font-bold">Fastighetsbeteckning</div>
            <div>
              {errand?.facilities?.map((estate, index) => (
                <Fragment key={`estate-${estate.id}`}>
                  {index === 0
                    ? estateToText(estate?.address?.propertyDesignation)
                    : ', ' + estateToText(estate?.address?.propertyDesignation)}
                </Fragment>
              ))}
              {errand?.facilities?.length === 0 ? '(saknas)' : null}
            </div>
          </div>
        ) : (
          <div className="pr-sm w-[40%]">
            <>
              {getOwnerStakeholder(errand)?.stakeholderType === 'PERSON' ? (
                <>
                  <div className="font-bold" data-cy="errandPersonalNumberLabel">
                    Personnummer
                  </div>
                  <div data-cy="errandPersonalNumber">
                    {errand && getOwnerStakeholder(errand)?.personalNumber
                      ? getOwnerStakeholder(errand)?.personalNumber
                      : '(saknas)'}
                  </div>
                </>
              ) : getOwnerStakeholder(errand)?.stakeholderType === 'ORGANIZATION' ? (
                <>
                  <div className="font-bold">Organisationsnummer</div>
                  <div>
                    {errand && getOwnerStakeholder(errand)?.organizationNumber
                      ? getOwnerStakeholder(errand)?.organizationNumber
                      : '(saknas)'}
                  </div>
                </>
              ) : null}
            </>
          </div>
        )}
      </div>
    </div>
  );
};
