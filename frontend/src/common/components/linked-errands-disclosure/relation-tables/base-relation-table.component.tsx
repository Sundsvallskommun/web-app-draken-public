import { CaseStatusResponse } from '@common/services/casestatus-service';
import { Table } from '@sk-web-gui/react';
import { FC, ReactNode } from 'react';
interface BaseRelationsTableProps {
  errands: CaseStatusResponse[];
  headers: ReactNode;
  title: string;
  dataCy: string;
  renderRow: (errand: any, index: number) => ReactNode;
}

export const BaseRelationsTable: FC<BaseRelationsTableProps> = ({ errands, headers, title, dataCy, renderRow }) => {
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
