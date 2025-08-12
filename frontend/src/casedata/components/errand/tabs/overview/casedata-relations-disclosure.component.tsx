import { IErrand } from '@casedata/interfaces/errand';
import { getTargetRelations, relationsLabelsCaseData } from '@common/services/relations-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Disclosure, SortMode, Spinner, Table } from '@sk-web-gui/react';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { ErrandsTable } from './errand-table.component';

export const CaseDataRelationsDisclosure: React.FC<{
  errand: IErrand;
}> = ({ errand }) => {
  const { watch, setValue } = useFormContext();
  const { municipalityId } = useAppContext();
  const [relationErrands, setRelationErrands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const sortOrder = watch('sortOrder') || 'ASC';

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        const relatedErrands = await getTargetRelations(municipalityId, errand.id.toString(), sortOrder);
        setRelationErrands(relatedErrands);

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching errands or relations:', error);
        setIsLoading(false);
      }
    };

    fetchErrands();
  }, [municipalityId, errand, sortOrder]);

  const handleSort = () => {
    setValue('sortOrder', sortOrder === 'DESC' ? 'ASC' : 'DESC');
  };

  const headers = relationsLabelsCaseData.map((header, index) => (
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

  return (
    <Disclosure
      variant="alt"
      icon={<LucideIcon name="network" />}
      header="Relaterade ärenden"
      data-cy={`facility-disclosure`}
    >
      <p className="mb-[2.4rem]">Nedan kan du se ärenden relaterade till detta ärende.</p>

      {isLoading ? (
        <div className="flex justify-center items-center h-[5rem]">
          <Spinner />
        </div>
      ) : (
        <ErrandsTable
          errands={relationErrands}
          headers={headers}
          linkedStates={relationErrands}
          title="Ärenden"
          dataCy="ongoingerrands-table"
        />
      )}
    </Disclosure>
  );
};
