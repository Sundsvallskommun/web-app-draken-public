import { CaseStatusResponse, getStatusesUsingPartyId } from '@common/services/casestatus-service';
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
import { Disclosure, SortMode, Spinner, Table } from '@sk-web-gui/react';
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
  const [linkedStatesOngoing, setLinkedStatesOngoing] = useState<boolean[]>([]);
  const [linkedStatesClosed, setLinkedStatesClosed] = useState<boolean[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const sortOrder = watch('sortOrder') || 'ascending';

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        const relatedPerson = supportErrand.stakeholders?.find(
          (stakeholder) => stakeholder.role === 'PRIMARY'
        )?.externalId;

        const relatedErrands = await getRelations(municipalityId, supportErrand.errandNumber);
        setRelationErrands(relatedErrands.data.relations);

        const fetchedErrands = await getStatusesUsingPartyId(municipalityId, relatedPerson);
        setLinkedErrands(sortBy(fetchedErrands, 'status'));

        const relatedData = Array.isArray(relatedErrands.data.relations) ? relatedErrands.data.relations : [];

        const ongoingErrands = fetchedErrands.filter((errand) => errand.status !== 'Klart');
        const closedErrands = fetchedErrands.filter((errand) => errand.status === 'Klart');

        setLinkedStatesOngoing(
          ongoingErrands.map((errand) =>
            relatedData.some((related) => related.target.resourceId === errand.errandNumber)
          )
        );

        setLinkedStatesClosed(
          closedErrands.map((errand) =>
            relatedData.some((related) => related.target.resourceId === errand.errandNumber)
          )
        );
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching errands or relations:', error);
        setIsLoading(false);
      }
    };

    fetchErrands();
  }, [municipalityId, supportErrand]);

  const handleLinkClick = (index: number, isOngoing: boolean) => {
    const errands = isOngoing
      ? linkedErrands.filter((errand) => errand.status !== 'Klart')
      : linkedErrands.filter((errand) => errand.status === 'Klart');
    const linkedStates = isOngoing ? linkedStatesOngoing : linkedStatesClosed;

    const matchingRelation = relationErrands.find(
      (relation) => relation.target.resourceId === errands[index].errandNumber
    );

    const relationId = matchingRelation ? matchingRelation.id : null;

    if (linkedStates[index]) {
      deleteRelation(municipalityId, relationId)
        .then(() => {
          setRelationErrands((prev) => prev.filter((relation) => relation.id !== relationId));
          if (isOngoing) {
            setLinkedStatesOngoing((prev) => {
              const newStates = [...prev];
              newStates[index] = false;
              return newStates;
            });
          } else {
            setLinkedStatesClosed((prev) => {
              const newStates = [...prev];
              newStates[index] = false;
              return newStates;
            });
          }
        })
        .catch((e) => console.error('Failed to delete relation:', e));
    } else {
      createRelation(municipalityId, supportErrand.errandNumber, errands[index].errandNumber)
        .then((res) => {
          setRelationErrands((prev) => [...prev, res.data]);
          if (isOngoing) {
            setLinkedStatesOngoing((prev) => {
              const newStates = [...prev];
              newStates[index] = true;
              return newStates;
            });
          } else {
            setLinkedStatesClosed((prev) => {
              const newStates = [...prev];
              newStates[index] = true;
              return newStates;
            });
          }
        })
        .catch((e) => console.error('Failed to create relation:', e));
    }
  };

  const handleSort = () => {
    setValue('sortOrder', sortOrder === 'descending' ? 'ascending' : 'descending');

    setLinkedErrands((prev) => {
      const sortedErrands = [...prev].reverse();

      const ongoingErrands = sortedErrands.filter((errand) => errand.status !== 'Klart');
      const closedErrands = sortedErrands.filter((errand) => errand.status === 'Klart');

      setLinkedStatesOngoing(
        ongoingErrands.map((errand) =>
          relationErrands.some((relation) => relation.target.resourceId === errand.errandNumber)
        )
      );

      setLinkedStatesClosed(
        closedErrands.map((errand) =>
          relationErrands.some((relation) => relation.target.resourceId === errand.errandNumber)
        )
      );

      return sortedErrands;
    });
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

  const ongoingErrands = linkedErrands.filter((errand) => errand.status !== 'Klart');
  const closedErrands = linkedErrands.filter((errand) => errand.status === 'Klart');

  return (
    <div className="mt-md">
      <Disclosure
        disabled={supportErrandIsEmpty(supportErrand)}
        variant="alt"
        icon={<LucideIcon name="link-2" />}
        header="Länkade ärenden"
        data-cy={`facility-disclosure`}
      >
        <p>Nedan väljer du vilket ärende du vill länka med detta ärende.</p>
        {isLoading ? (
          <div className="flex justify-center items-center h-[5rem]">
            <Spinner />
          </div>
        ) : (
          <>
            <ErrandsTable
              errands={ongoingErrands}
              headers={headers}
              linkedStates={linkedStatesOngoing}
              handleLinkClick={(index) => handleLinkClick(index, true)}
              title="Pågående"
              dataCy="ongoingerrands-table"
            />
            <ErrandsTable
              errands={closedErrands}
              headers={headers}
              linkedStates={linkedStatesClosed}
              handleLinkClick={(index) => handleLinkClick(index, false)}
              title="Avslutade"
              dataCy="closederrands-table"
            />
          </>
        )}
      </Disclosure>
    </div>
  );
};
