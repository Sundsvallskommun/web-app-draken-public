import { IErrand } from '@casedata/interfaces/errand';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { RelationsFromTable } from '@common/components/linked-errands-disclosure/relation-tables/relations-from-table.component';
import { Relation } from '@common/data-contracts/relations/data-contracts';
import {
  CaseStatusResponse,
  getErrandStatus,
  getStatusesUsingOrganizationNumber,
  getStatusesUsingPartyId,
} from '@common/services/casestatus-service';
import { sortBy } from '@common/services/helper-service';
import {
  createRelation,
  deleteRelation,
  getResolvedSourceRelations,
  getTargetRelations,
} from '@common/services/relations-service';
import { appConfig } from '@config/appconfig';
import { Disclosure, SearchField, Spinner } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { SupportErrand, supportErrandIsEmpty } from '@supportmanagement/services/support-errand-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import { Link2 } from 'lucide-react';
import { FC, useEffect, useState } from 'react';

import { RelationsToTable } from './relation-tables/relations-to-table.component';

export const LinkedErrandsDisclosure: FC<{
  errand: SupportErrand | IErrand;
}> = ({ errand }) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [isLoadingToErrands, setIsLoadingToErrands] = useState<boolean>(false);
  const [isLoadingFromErrands, setIsLoadingFromErrands] = useState<boolean>(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [searchedErrands, setSearchedErrands] = useState<CaseStatusResponse[]>([]);
  const [relationToErrands, setRelationToErrands] = useState<CaseStatusResponse[]>([]);
  const [relationFromErrands, setRelationFromErrands] = useState<CaseStatusResponse[]>([]);
  const [resolvedSourceStatuses, setResolvedSourceStatuses] = useState<CaseStatusResponse[]>([]);

  const sortOrder = 'ASC';

  // Derived state
  const resolvedOtherErrands = resolvedSourceStatuses.filter(
    (status) => !relationToErrands.some((relErrand) => relErrand.caseId === status.caseId)
  );
  const ongoingErrands = relationToErrands.filter(
    (errand) => errand.status !== 'Klart' && !resolvedOtherErrands.some((other) => other.caseId === errand.caseId)
  );
  const closedErrands = relationToErrands.filter((errand) => errand.status === 'Klart');

  const refreshSourceRelations = async () => {
    const { relations: updatedRelations, caseStatuses } = await getResolvedSourceRelations(
      municipalityId,
      errand.id!.toString(),
      sortOrder
    );
    setRelations(updatedRelations);
    setResolvedSourceStatuses(caseStatuses);
  };

  const handleLinkClick = (id: string) => {
    if (relations.some((relation) => relation.target.resourceId === id)) {
      deleteRelation(municipalityId, relations.find((relation) => relation.target.resourceId === id)!.id!)
        .then(() => refreshSourceRelations())
        .catch((e) => console.error('Failed to delete relation:', e));
    } else {
      const targetErrand = [...relationToErrands, ...searchedErrands].find((errand) => errand.caseId === id);
      createRelation(municipalityId, errand.id!.toString(), targetErrand!)
        .then(() => refreshSourceRelations())
        .catch((e) => console.error('Failed to create relation:', e));
    }
  };

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        setIsLoadingToErrands(true);

        await refreshSourceRelations();

        if (appConfig.features.useStakeholderRelations) {
          let relatedPerson: {
            id: string;
            type: string;
          } = { id: '', type: '' };

          if (appConfig.isSupportManagement) {
            const supportStakeholder = getSupportOwnerStakeholder(errand as SupportErrand);
            if (!supportStakeholder) {
              setIsLoadingToErrands(false);
              return;
            }
            relatedPerson.id = supportStakeholder?.externalId ?? '';
            relatedPerson.type = supportStakeholder?.stakeholderType ?? '';
          }
          if (appConfig.isCaseData) {
            const caseDataStakeholder = getOwnerStakeholder(errand as IErrand);
            if (!caseDataStakeholder) {
              setIsLoadingToErrands(false);
              return;
            }
            relatedPerson.id = caseDataStakeholder?.personId || caseDataStakeholder?.organizationNumber || '';
            relatedPerson.type = caseDataStakeholder.stakeholderType;
          }

          const fetchedErrands =
            relatedPerson.type === 'PERSON'
              ? await getStatusesUsingPartyId(municipalityId, relatedPerson.id)
              : await getStatusesUsingOrganizationNumber(municipalityId, relatedPerson.id);
          setRelationToErrands(sortBy(fetchedErrands, 'status'));
        }
        setIsLoadingToErrands(false);
      } catch (error) {
        console.error('Error fetching errands or relations:', error);
        setIsLoadingToErrands(false);
      }
    };

    fetchErrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        setIsLoadingFromErrands(true);
        const { caseStatuses } = await getTargetRelations(municipalityId, errand.id!.toString(), sortOrder);
        setRelationFromErrands(caseStatuses);
        setIsLoadingFromErrands(false);
      } catch (error) {
        console.error('Error fetching errands or relations:', error);
        setIsLoadingFromErrands(false);
      }
    };

    fetchErrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  return (
    <Disclosure
      disabled={appConfig.isSupportManagement ? supportErrandIsEmpty(errand as SupportErrand) : false}
      variant="alt"
      data-cy={`connected-errands-disclosure`}
    >
      <Disclosure.Header>
        <Disclosure.Icon icon={<Link2 />} />
        <Disclosure.Title>Kopplade ärenden</Disclosure.Title>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        <h2 className="pt-[1.2rem] text-h2-md">Kopplingar skapade från detta ärende</h2>
        <p className="my-[2.4rem]">Nedan väljer du vilket ärende du vill länka med detta ärende.</p>

        {isLoadingToErrands ? (
          <div className="flex justify-center items-center h-[5rem]">
            <Spinner />
          </div>
        ) : (
          <>
            <p className="text-label-small">Sök ärende</p>
            <SearchField
              className="w-[52rem] mb-[2.4rem]"
              placeholder="Sök på ett specifikt ärendenummer eller fastighet"
              value={query}
              onSearch={(e) => {
                setSearching(true);
                getErrandStatus(municipalityId, e).then((res) => {
                  setSearching(false);
                  setSearchedErrands(res);
                });
              }}
              onReset={() => {
                setSearching(false);
                setQuery('');
                setSearchedErrands([]);
              }}
              searchLabel={searching ? 'Söker' : 'Sök'}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
            />

            {searchedErrands.length > 0 && (
              <RelationsToTable
                errands={searchedErrands}
                linkedStates={relations}
                handleLinkClick={(index) => handleLinkClick(index)}
                title=""
                dataCy="searchresults-table"
              />
            )}
            {appConfig.features.useStakeholderRelations && (
              <>
                <RelationsToTable
                  errands={ongoingErrands}
                  linkedStates={relations}
                  handleLinkClick={(index) => handleLinkClick(index)}
                  title="Pågående"
                  dataCy="ongoingerrands-table"
                />

                <RelationsToTable
                  errands={closedErrands}
                  linkedStates={relations}
                  handleLinkClick={(index) => handleLinkClick(index)}
                  title="Avslutade"
                  dataCy="closederrands-table"
                />
              </>
            )}
            <RelationsToTable
              errands={resolvedOtherErrands}
              linkedStates={relations}
              handleLinkClick={(index) => handleLinkClick(index)}
              title="Kopplingar till annan ärendeägare"
              dataCy="othererrands-table"
            />
          </>
        )}
        <h2 className="py-[2.4rem] text-h2-md">Kopplingar skapade till detta ärende</h2>
        <p className="mb-[1.2rem]">Nedan kan du se ärenden kopplade till detta ärende.</p>
        {isLoadingFromErrands ? (
          <div className="flex justify-center items-center h-[5rem]">
            <Spinner />
          </div>
        ) : (
          <RelationsFromTable errands={relationFromErrands} title="Ärenden" dataCy="ongoingerrands-table" />
        )}
      </Disclosure.Content>
    </Disclosure>
  );
};
