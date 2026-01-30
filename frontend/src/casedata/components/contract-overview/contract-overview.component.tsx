import { Contract, ContractPaginatedResponse, ContractType } from '@casedata/interfaces/contracts';
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
    defaultValues: { sortColumn: 'start', sortOrder: 'desc', pageSize: 12, page: 1 },
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

  // Ensure pageSize is a valid number, fallback to 12
  const validPageSize = pageSize && !isNaN(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : 12;

  // Build filter object
  const filterParams = useMemo<ContractFilterParams>(() => {
    const params: ContractFilterParams = {
      page: page || 1,
      limit: validPageSize,
      sortBy: sortColumn,
      sortOrder,
    };

    if (queryFilter) {
      params.query = queryFilter.trim();
    }
    if (statusFilter && statusFilter.length > 0) {
      params.status = statusFilter.join(',');
    }
    if (contractTypeFilter && contractTypeFilter.length > 0) {
      params.contractType = contractTypeFilter.join(',');
    }
    if (leaseTypeFilter && leaseTypeFilter.length > 0) {
      params.leaseType = leaseTypeFilter.join(',');
    }
    if (startdate) {
      params.startDate = startdate.trim();
    }
    if (enddate) {
      params.endDate = enddate.trim();
    }

    return params;
  }, [
    page,
    validPageSize,
    sortColumn,
    sortOrder,
    queryFilter,
    statusFilter,
    contractTypeFilter,
    leaseTypeFilter,
    startdate,
    enddate,
  ]);

  // Reset page when filters or sort changes (but not when page itself changes)
  useEffect(() => {
    setTableValue('page', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sortColumn,
    sortOrder,
    validPageSize,
    queryFilter,
    statusFilter,
    contractTypeFilter,
    leaseTypeFilter,
    startdate,
    enddate,
  ]);

  // Fetch contracts when params change (debounced)
  useDebounceEffect(
    () => {
      setIsLoading(true);
      fetchContracts(filterParams)
        .then((res: ContractPaginatedResponse) => {
          setContracts(res.contracts || []);
          // Update pagination metadata from server response
          const meta = res._meta;
          if (meta) {
            setTableValue('totalElements', meta.totalRecords || 0);
            setTableValue('totalPages', meta.totalPages || 1);
            setTableValue('size', meta.count || 0);
          }
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
