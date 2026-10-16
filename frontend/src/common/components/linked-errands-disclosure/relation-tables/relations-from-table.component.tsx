import {
  BaseRelationsTable,
  RelationErrandCells,
  relationTableHeaders,
} from '@common/components/linked-errands-disclosure/relation-tables/base-relation-table.component';
import { CaseStatusResponse } from '@common/services/casestatus-service';
import { relationsFromLabels } from '@common/services/relations-service';
import { Table } from '@sk-web-gui/react';
import { FC } from 'react';
interface RelationsFromTableProps {
  errands: CaseStatusResponse[];
  title: string;
  dataCy: string;
}

const headers = relationTableHeaders(relationsFromLabels);

export const RelationsFromTable: FC<RelationsFromTableProps> = ({ errands, title, dataCy }) => {
  return (
    <BaseRelationsTable
      errands={errands}
      headers={headers}
      title={title}
      dataCy={dataCy}
      renderRow={(errand) => (
        <>
          <RelationErrandCells errand={errand} />
          <Table.Column className="w-[16.4rem]" />
        </>
      )}
    />
  );
};
