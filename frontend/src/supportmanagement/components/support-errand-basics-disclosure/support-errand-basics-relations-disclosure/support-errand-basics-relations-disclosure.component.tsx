import {
  CaseStatusResponse,
  getErrandNumberfromId,
  getErrandStatus,
  getStatusesUsingPartyId,
} from '@common/services/casestatus-service';
import { sortBy } from '@common/services/helper-service';
import {
  createRelation,
  deleteRelation,
  getRelations,
  Relations,
  relationsLabels,
} from '@common/services/relations-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Disclosure, SearchField, SortMode, Spinner, Table } from '@sk-web-gui/react';
import { SupportErrand, supportErrandIsEmpty } from '@supportmanagement/services/support-errand-service';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ErrandsTable } from './relations-table.component';

export const SupportErrandBasicsRelationsDisclosure: React.FC<{
  supportErrand: SupportErrand;
}> = ({ supportErrand }) => {
  const { watch, setValue } = useFormContext();
  const { municipalityId } = useAppContext();

  const [relationErrands, setRelationErrands] = useState<Relations[]>([]);
  const [linkedErrands, setLinkedErrands] = useState<CaseStatusResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchedErrands, setSearchedErrands] = useState<CaseStatusResponse[]>([]);

  const sortOrder = watch('sortOrder') || 'ASC';

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        const relatedPerson = supportErrand.stakeholders?.find(
          (stakeholder) => stakeholder.role === 'PRIMARY'
        )?.externalId;

        if (!relatedPerson) {
          return;
        }

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
  }, [municipalityId, supportErrand, sortOrder]);

  const handleLinkClick = (id: string) => {
    if (relationErrands.some((relation) => relation.target.resourceId === id)) {
      deleteRelation(municipalityId, relationErrands.find((relation) => relation.target.resourceId === id)?.id)
        .then(async () => {
          const relatedErrands = await getRelations(municipalityId, supportErrand.id, 'ASC');
          setRelationErrands(relatedErrands);
        })
        .catch((e) => console.error('Failed to delete relation:', e));
    } else {
      createRelation(municipalityId, supportErrand.id, id)
        .then(async (res) => {
          const relatedErrands = await getRelations(municipalityId, supportErrand.id, 'ASC');
          setRelationErrands(relatedErrands);
        })
        .catch((e) => console.error('Failed to create relation:', e));
    }
  };

  const handleSort = () => {
    setValue('sortOrder', sortOrder === 'DESC' ? 'ASC' : 'DESC');
  };

  const headers = relationsLabels.map((header, index) => (
    <Table.HeaderColumn key={`header-${index}`} sticky={true}>
      {header.screenReaderOnly ? (
        <span className="sr-only">{header.label}</span>
      ) : header.sortable ? (
        <Table.SortButton isActive={true} sortOrder={sortOrder as SortMode} onClick={handleSort}>
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
      const list = await Promise.all(
        tmpOtherErrands.map((relation) => getErrandNumberfromId(municipalityId, relation.target.resourceId))
      );
      const promises = await Promise.all(list.map((_relation, key) => getErrandStatus(municipalityId, list[key])));

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
              <ErrandsTable
                errands={searchedErrands}
                headers={headers}
                linkedStates={relationErrands}
                handleLinkClick={(index) => handleLinkClick(index)}
                title=""
                dataCy="searchresults-table"
              />
            )}
            <ErrandsTable
              errands={ongoingErrands}
              headers={headers}
              linkedStates={relationErrands}
              handleLinkClick={(index) => handleLinkClick(index)}
              title="Pågående"
              dataCy="ongoingerrands-table"
            />
            <ErrandsTable
              errands={closedErrands}
              headers={headers}
              linkedStates={relationErrands}
              handleLinkClick={(index) => handleLinkClick(index)}
              title="Avslutade"
              dataCy="closederrands-table"
            />
            <ErrandsTable
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
