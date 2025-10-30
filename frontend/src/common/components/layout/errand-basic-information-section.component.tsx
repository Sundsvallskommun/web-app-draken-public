import { CaseLabels } from '@casedata/interfaces/case-label';
import { appConfig } from '@config/appconfig';
import { useAppContext } from '@contexts/app.context';
import { Fragment } from 'react';
import { PriorityComponent } from '../priority/priority.component';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';

const ErrandBasicInformationSection: React.FC = () => {
  const { errand, supportMetadata, supportErrand } = useAppContext();

  function estateToText(propertyDesignation?: string) {
    if (!propertyDesignation) {
      return '(saknas)';
    }
    const MunicipalityName = propertyDesignation.toLowerCase().split(' ')[0];
    const propertyName = propertyDesignation
      .toLowerCase()
      .substring(propertyDesignation.toLowerCase().indexOf(' ') + 1);

    return (
      MunicipalityName.charAt(0).toUpperCase() +
      String(MunicipalityName).slice(1) +
      ' ' +
      propertyName.charAt(0).toUpperCase() +
      String(propertyName).slice(1)
    );
  }

  if (appConfig.isCaseData) {
    return (
      <section className="container bg-transparent pt-24 pb-4">
        <div className="flex justify-between mb-md w-full">
          <div className="w-full flex flex-wrap flex-col justify-between">
            {errand && errand.id ? (
              <>
                <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-24 pt-8 w-full">
                  <h1 className="max-md:w-full text-h3-sm md:text-h3-md xl:text-h2-lg mb-0 break-words">
                    {errand && errand.id ? CaseLabels.ALL[errand?.caseType as keyof typeof CaseLabels.ALL] : ''}
                  </h1>
                </div>
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
                          {errand?.facilities?.length === 0 ? '(saknas)' : <></>}
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
              </>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (appConfig.isSupportManagement) {
    return (
      <section className="container bg-transparent pt-24 pb-4">
        <div className="container m-auto pl-0">
          <div className="w-full flex flex-wrap flex-col justify-between gap-24">
            <h1 className="max-md:w-full text-h2-sm md:text-h2-md xl:text-h2-md mb-0 break-words">
              {
                supportMetadata?.categories?.find((c) => c.name === supportErrand?.classification?.category)
                  ?.displayName
              }
            </h1>
          </div>
        </div>
      </section>
    );
  }

  return <></>;
};

export default ErrandBasicInformationSection;
