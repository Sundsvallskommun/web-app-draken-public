import { useAppContext } from '@common/contexts/app.context';
import { AutoTable, AutoTableHeader } from '@sk-web-gui/react';
import { useEffect, useState } from 'react';

import { assetStatusLabels, assetTypeLabels } from '@casedata/interfaces/asset';
import { validateAction } from '@casedata/services/casedata-errand-service';

export const CasedataPermitServicesTab: React.FC<{}> = () => {
  const { errand, assets, user } = useAppContext();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user) && !!errand.administrator;
    setAllowed(_a);
  }, [user, errand]);

  const assetHeaders: AutoTableHeader[] = [
    {
      property: 'type',
      label: 'Typ',
      isColumnSortable: false,
      renderColumn: (value) => {
        return (
          <span>
            <strong data-cy="table-column-type">
              {Object.entries(assetTypeLabels).find((x) => x[0] === value)[1]}
            </strong>
          </span>
        );
      },
    },
    {
      property: 'assetId',
      label: 'Kortnummer',
      isColumnSortable: false,
      renderColumn: (value) => {
        return <span data-cy="table-column-assetId">{value}</span>;
      },
    },
    {
      property: 'status',
      label: 'Status',
      isColumnSortable: false,
      renderColumn: (value) => {
        return (
          <span data-cy="table-column-status">{Object.entries(assetStatusLabels).find((x) => x[0] === value)[1]}</span>
        );
      },
    },
    {
      property: 'caseReferenceIds',
      label: 'Ärendenummer',
      isColumnSortable: false,
      renderColumn: (value) => {
        return (
          <>
            {value.map((v) => {
              return (
                <span data-cy="table-column-errandNumber" key={`caseref-${v}`}>
                  {v}
                </span>
              );
            })}
          </>
        );
      },
    },
    {
      property: 'issued',
      label: 'Beslutad',
      isColumnSortable: false,
      renderColumn: (value) => {
        return <span data-cy="table-column-issued">{value}</span>;
      },
    },
    {
      property: 'validTo',
      label: 'Giltighetstid',
      isColumnSortable: false,
      renderColumn: (value, item) => {
        return <span data-cy="table-column-validTo">{`${item.issued} - ${new Date(value).toLocaleDateString()}`}</span>;
      },
    },
  ];

  return (
    <>
      <div className="w-full flex justify-between items-center flex-wrap h-40">
        <div className="inline-flex mt-ms gap-lg justify-start items-center flex-wrap">
          <h2 className="text-h2-md max-medium-device:text-h4-md">Tillstånd och tjänster</h2>
        </div>
      </div>
      <div className="py-8 w-full gap-24">
        <p className="w-4/5 pr-16">Här samlas historik på ärendeägarens tillstånd och tjänster</p>
      </div>
      {assets && assets.length !== 0 && (
        <AutoTable
          background={false}
          footer={false}
          autodata={assets}
          autoheaders={assetHeaders}
          data-cy="assets-table"
        />
      )}
    </>
  );
};
