import {
  BaseRelationsTable,
  RelationErrandCells,
  relationTableHeaders,
} from '@common/components/linked-errands-disclosure/relation-tables/base-relation-table.component';
import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';
import { Relation } from '@common/data-contracts/relations/data-contracts';
import { CaseStatusResponse } from '@common/services/casestatus-service';
import { relationsToLabels } from '@common/services/relations-service';
import { Button, Table } from '@sk-web-gui/react';
import { FC } from 'react';
interface RelationsToTableProps {
  errands: CaseStatusResponse[];
  linkedStates: Relation[];
  handleLinkClick: (index: string) => void;
  title: string;
  dataCy: string;
}

const LinkButtonComponent: FC<{ isLinked: boolean; onClick: () => void }> = ({ isLinked, onClick }) => {
  return (
    <div className="flex justify-center">
      <Button
        variant={isLinked ? 'secondary' : 'primary'}
        color={'primary'}
        size="sm"
        className="w-full justify-start"
        onClick={onClick}
        leftIcon={(() => {
          const DynIcon = iconMap[isLinked ? 'link-2-off' : 'link-2'];
          return DynIcon ? <DynIcon size={16} /> : undefined;
        })()}
      >
        {isLinked ? 'Bryt koppling' : 'Koppla'}
      </Button>
    </div>
  );
};

const headers = relationTableHeaders(relationsToLabels);

export const RelationsToTable: FC<RelationsToTableProps> = ({
  errands,
  linkedStates,
  handleLinkClick,
  title,
  dataCy,
}) => {
  return (
    <BaseRelationsTable
      errands={errands}
      headers={headers}
      title={title}
      dataCy={dataCy}
      renderRow={(errand) => (
        <>
          <RelationErrandCells errand={errand} />
          <Table.Column className="w-[16.4rem]">
            <LinkButtonComponent
              isLinked={linkedStates.some((relation) => relation.target.resourceId === errand.caseId)}
              onClick={() => handleLinkClick(errand.caseId)}
            />
          </Table.Column>
        </>
      )}
    />
  );
};
