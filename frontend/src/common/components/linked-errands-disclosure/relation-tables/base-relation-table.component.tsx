import { CaseStatusResponse } from '@common/services/casestatus-service';
import { Table } from '@sk-web-gui/react';
import React from 'react';

interface BaseRelationsTableProps {
  errands: CaseStatusResponse[];
  headers: React.ReactNode;
  title: string;
  dataCy: string;
  renderRow: (errand: any, index: number) => React.ReactNode;
}

export const BaseRelationsTable: React.FC<BaseRelationsTableProps> = ({
  errands,
  headers,
  title,
  dataCy,
  renderRow,
}) => {
  return (
    <>
      <h3 className="py-[1.2rem] text-h3-md">{title}</h3>
      <Table data-cy={dataCy} aria-describedby={`${dataCy}-table`} scrollable>
        {!errands.length ? (
          <caption id={`${dataCy}TableCaption`} className="my-32">
            Det finns inga ärenden
          </caption>
        ) : (
          <>
            <Table.Header>{headers}</Table.Header>
            <Table.Body>
              {errands.map((errand, index) => (
                <Table.Row key={`row-${index}`}>{renderRow(errand, index)}</Table.Row>
              ))}
            </Table.Body>
          </>
        )}
      </Table>
    </>
  );
};
