import { Contract, ContractType, PageContract } from '@casedata/interfaces/contracts';
import { ContractFilterParams, contractTypes, fetchContracts } from '@casedata/services/contract-service';
import { DetailPanelWrapper } from '@common/components/detail-panel-wrapper/detail-panel-wrapper.component';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import { Button, Link, useSnackbar } from '@sk-web-gui/react';
import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { ContractDetailForm } from './contract-detail-form.component';
import { ContractFilter, ContractFilterValues, ContractsFilteringComponent } from './contracts-filtering.component';
import { ContractsTable, ContractTableForm } from './contracts-table.component';

const getContractTypeLabel = (type: ContractType): string => {
  return contractTypes.find((t) => t.key === type)?.label || 'Avtal';
};

export const ContractOverview: React.FC = () => {
  const filterForm = useForm<ContractFilter>({ defaultValues: ContractFilterValues });
  const { watch: watchFilter } = filterForm;

  const tableForm = useForm<ContractTableForm>({
    defaultValues: { sortColumn: 'startDate', sortOrder: 'desc', pageSize: 12, page: 0 },
  });
  const { watch: watchTable, setValue: setTableValue } = tableForm;

  const toastMessage = useSnackbar();

  const sortOrder = watchTable('sortOrder');
  const sortColumn = watchTable('sortColumn');
  const pageSize = watchTable('pageSize');
  const page = watchTable('page');

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedContract, setSelectedContract] = useState<Contract | undefined>();
  const [showSelectedContract, setShowSelectedContract] = useState(false);
  const [contractsResponse, setContractsResponse] = useState<PageContract | null>(null);

  const [filterObject, setFilterObject] = useState<{ [key: string]: string }>({});

  const handleRowClick = (contract: Contract) => {
    setSelectedContract(contract);
    setShowSelectedContract(true);
  };

  const closeHandler = () => {
    setSelectedContract(undefined);
    setShowSelectedContract(false);
  };

  const queryFilter = watchFilter('query');
  const statusFilter = watchFilter('status');
  const contractTypeFilter = watchFilter('contractType');
  const leaseTypeFilter = watchFilter('leaseType');
  const startdate = watchFilter('startdate');
  const enddate = watchFilter('enddate');

  const validPageSize = pageSize && !isNaN(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : 12;

  useDebounceEffect(
    () => {
      const fObj: { [key: string]: string } = {};
      if (queryFilter?.trim()) {
        fObj['query'] = queryFilter.trim();
      }
      if (statusFilter && statusFilter.length > 0) {
        fObj['status'] = statusFilter.join(',');
      }
      if (contractTypeFilter && contractTypeFilter.length > 0) {
        fObj['contractType'] = contractTypeFilter.join(',');
      }
      if (leaseTypeFilter && leaseTypeFilter.length > 0) {
        fObj['leaseType'] = leaseTypeFilter.join(',');
      }
      if (startdate?.trim()) {
        fObj['startDate'] = startdate.trim();
      }
      if (enddate?.trim()) {
        fObj['endDate'] = enddate.trim();
      }
      setFilterObject(fObj);
    },
    200,
    [queryFilter, statusFilter, contractTypeFilter, leaseTypeFilter, startdate, enddate]
  );

  useEffect(() => {
    setTableValue('page', 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterObject, sortColumn, sortOrder, validPageSize]);

  useEffect(() => {
    if (contractsResponse) {
      setContracts(contractsResponse.content || []);
      setTableValue('page', contractsResponse.number || 0);
      setTableValue('totalElements', contractsResponse.totalElements || 0);
      setTableValue('totalPages', contractsResponse.totalPages || 1);
      setTableValue('size', contractsResponse.size || 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractsResponse]);

  const filterParams = useMemo<ContractFilterParams>(() => {
    const params: ContractFilterParams = {
      page: page ?? 0,
      limit: validPageSize,
      sortBy: sortColumn,
      sortOrder: sortOrder,
    };

    if (filterObject.query) {
      params.query = filterObject.query;
    }
    if (filterObject.status) {
      params.status = filterObject.status;
    }
    if (filterObject.contractType) {
      params.contractType = filterObject.contractType;
    }
    if (filterObject.leaseType) {
      params.leaseType = filterObject.leaseType;
    }
    if (filterObject.startDate) {
      params.startDate = filterObject.startDate;
    }
    if (filterObject.endDate) {
      params.endDate = filterObject.endDate;
    }

    return params;
  }, [page, validPageSize, sortColumn, sortOrder, filterObject]);

  useDebounceEffect(
    () => {
      setIsLoading(true);
      fetchContracts(filterParams)
        .then((res: PageContract) => {
          setContractsResponse(res);
        })
        .catch((e) => {
          console.error('Error fetching contracts:', e);
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Något gick fel när avtalen skulle hämtas',
            status: 'error',
          });
          setContracts([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    200,
    [filterParams]
  );

  return (
    <div className="w-full h-screen relative flex flex-col overflow-hidden">
      <div className="box-border px-40 py-19 w-full flex justify-end items-center shadow-lg min-h-[6rem] max-small-device-max:px-24 flex-shrink-0">
        <Link
          href={`${process.env.NEXT_PUBLIC_BASEPATH}/registrera`}
          target="_blank"
          data-cy="register-new-errand-button"
        >
          <Button color={'vattjom'} variant={'primary'}>
            Nytt ärende
          </Button>
        </Link>
      </div>

      <main className="px-24 md:px-40 pb-40 w-full flex-1 overflow-auto">
        <div className="container mx-auto p-0 w-full">
          <div className="mt-32 flex flex-col gap-16">
            <div>
              <h1 className="p-0 m-0">Alla avtal</h1>
            </div>
            <div className="container px-0 flex flex-wrap gap-16 items-center">
              <FormProvider {...filterForm}>
                <ContractsFilteringComponent />
              </FormProvider>
            </div>
            <div>
              <FormProvider {...tableForm}>
                <ContractsTable contracts={contracts} isLoading={isLoading} onRowClick={handleRowClick} />
              </FormProvider>
            </div>
          </div>
        </div>
      </main>

      {selectedContract && (
        <DetailPanelWrapper
          show={showSelectedContract}
          label={getContractTypeLabel(selectedContract.type)}
          closeAriaLabel="Stäng avtal"
          closeHandler={closeHandler}
          icon="file-text"
          dataCy="contract-detail"
        >
          <ContractDetailForm selectedContract={selectedContract} />
        </DetailPanelWrapper>
      )}
    </div>
  );
};
