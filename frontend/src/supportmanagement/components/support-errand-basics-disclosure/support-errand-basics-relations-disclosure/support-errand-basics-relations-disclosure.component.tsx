import { CaseStatusResponse, getErrandStatus, getStatusesUsingPartyId } from '@common/services/casestatus-service';
import { sortBy } from '@common/services/helper-service';
import {
  createRelation,
  deleteRelation,
  getRelations,
  Relation,
  relationsLabels,
} from '@common/services/relations-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Disclosure, SearchField, SortMode, Spinner, Table } from '@sk-web-gui/react';
import { SupportErrand, supportErrandIsEmpty } from '@supportmanagement/services/support-errand-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import { useEffect, useState } from 'react';
import { SupportRelationsTable } from './support-relations-table.component';

export const SupportErrandBasicsRelationsDisclosure: React.FC<{
  supportErrand: SupportErrand;
}> = ({ supportErrand }) => {
  const { municipalityId } = useAppContext();

  const [relationErrands, setRelationErrands] = useState<Relation[]>([]);
  const [linkedErrands, setLinkedErrands] = useState<CaseStatusResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchedErrands, setSearchedErrands] = useState<CaseStatusResponse[]>([]);

  const sortOrder = 'ASC';

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        setIsLoading(true);
        const relatedPerson = getSupportOwnerStakeholder(supportErrand)?.externalId;

        const relatedErrands = await getRelations(municipalityId, supportErrand.id, sortOrder);
        setRelationErrands(relatedErrands);

        const fetchedErrands = await getStatusesUsingPartyId(municipalityId, relatedPerson);
        setLinkedErrands(sortBy(fetchedErrands, 'status'));

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching errands or relations:', error);
        setIsLoading(false);
      }
    };

    fetchErrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportErrand]);

  const handleLinkClick = (id: string) => {
    if (relationErrands.some((relation) => relation.target.resourceId === id)) {
      deleteRelation(municipalityId, relationErrands.find((relation) => relation.target.resourceId === id)?.id)
        .then(async () => {
          const relatedErrands = await getRelations(municipalityId, supportErrand.id, 'ASC');
          setRelationErrands(relatedErrands);
        })
        .catch((e) => console.error('Failed to delete relation:', e));
    } else {
      const targetErrand = [...linkedErrands, ...searchedErrands].find((errand) => errand.caseId === id);
      createRelation(municipalityId, supportErrand.id, supportErrand.errandNumber, targetErrand)
        .then(async () => {
          const relatedErrands = await getRelations(municipalityId, supportErrand.id, 'ASC');
          setRelationErrands(relatedErrands);
        })
        .catch((e) => console.error('Failed to create relation:', e));
    }
  };

  const headers = relationsLabels.map((header, index) => (
    <Table.HeaderColumn key={`header-${index}`} sticky={true}>
      {header.screenReaderOnly ? (
        <span className="sr-only">{header.label}</span>
      ) : header.sortable ? (
        <Table.SortButton isActive={true} sortOrder={sortOrder as SortMode} onClick={() => {}}>
          {header.label}
        </Table.SortButton>
      ) : (
        header.label
      )}
    </Table.HeaderColumn>
  ));

  const [resolvedOtherErrands, setResolvedOtherErrands] = useState<CaseStatusResponse[]>([]);

  let ongoingErrands = linkedErrands.filter(
    (errand) => errand.status !== 'Klart' && !resolvedOtherErrands.some((other) => other.caseId === errand.caseId)
  );
  let closedErrands = linkedErrands.filter((errand) => errand.status === 'Klart');

  useEffect(() => {
    const fetchOtherErrands = async () => {
      const tmpOtherErrands = relationErrands.filter(
        (relation) => !linkedErrands.some((errand) => errand.caseId === relation.target.resourceId)
      );
      const promises = await Promise.all(
        tmpOtherErrands.map((relation) => getErrandStatus(municipalityId, relation.target.type))
      );

      setResolvedOtherErrands(promises.flat());
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ongoingErrands = linkedErrands.filter(
        (errand) => errand.status !== 'Klart' && !resolvedOtherErrands.some((other) => other.caseId === errand.caseId)
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
      closedErrands = linkedErrands.filter((errand) => errand.status === 'Klart');
    };
    fetchOtherErrands();
  }, [municipalityId, relationErrands, linkedErrands]);

  return (
    <div className="mt-md">
      <Disclosure
        disabled={supportErrandIsEmpty(supportErrand)}
        variant="alt"
        icon={<LucideIcon name="link-2" />}
        header="Länkade ärenden"
        data-cy={`facility-disclosure`}
      >
        <p className="mb-[2.4rem]">Nedan väljer du vilket ärende du vill länka med detta ärende.</p>

        {isLoading ? (
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
              readOnly={isLoading}
            />

            {searchedErrands.length > 0 && (
              <SupportRelationsTable
                errands={searchedErrands}
                headers={headers}
                linkedStates={relationErrands}
                handleLinkClick={(index) => handleLinkClick(index)}
                title=""
                dataCy="searchresults-table"
              />
            )}
            <SupportRelationsTable
              errands={ongoingErrands}
              headers={headers}
              linkedStates={relationErrands}
              handleLinkClick={(index) => handleLinkClick(index)}
              title="Pågående"
              dataCy="ongoingerrands-table"
            />
            <SupportRelationsTable
              errands={closedErrands}
              headers={headers}
              linkedStates={relationErrands}
              handleLinkClick={(index) => handleLinkClick(index)}
              title="Avslutade"
              dataCy="closederrands-table"
            />
            <SupportRelationsTable
              errands={resolvedOtherErrands}
              headers={headers}
              linkedStates={relationErrands}
              handleLinkClick={(index) => handleLinkClick(index)}
              title="Länkade, ej kopplat till ärendeägare"
              dataCy="othererrands-table"
            />
          </>
        )}
      </Disclosure>
    </div>
  );
};
