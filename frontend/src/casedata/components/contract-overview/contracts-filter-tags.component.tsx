import { contractTypes, leaseTypes } from '@casedata/services/contract-service';
import { Chip } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

import { ContractFilter, ContractFilterValues, statusOptions } from './contracts-filtering.component';

const getStatusLabel = (value: string): string => {
  return statusOptions.find((option) => option.value === value)?.label || value;
};

const getContractTypeLabel = (value: string): string => {
  return contractTypes.find((type) => type.key === value)?.label || value;
};

const getLeaseTypeLabel = (value: string): string => {
  return leaseTypes.find((type) => type.key === value)?.label || value;
};

export const ContractsFilterTags: FC = () => {
  const { watch, setValue, reset } = useFormContext<ContractFilter>();

  const statuses = watch('status');
  const contractTypeValues = watch('contractType');
  const leaseTypeValues = watch('leaseType');
  const startdate = watch('startdate');
  const enddate = watch('enddate');

  const hasTags =
    statuses.length > 0 || contractTypeValues.length > 0 || leaseTypeValues.length > 0 || startdate || enddate;

  const handleRemoveStatus = (value: string) => {
    setValue(
      'status',
      statuses.filter((status) => status !== value)
    );
  };

  const handleRemoveContractType = (value: string) => {
    setValue(
      'contractType',
      contractTypeValues.filter((type) => type !== value)
    );
  };

  const handleRemoveLeaseType = (value: string) => {
    setValue(
      'leaseType',
      leaseTypeValues.filter((type) => type !== value)
    );
  };

  const handleRemoveDates = () => {
    setValue('startdate', '');
    setValue('enddate', '');
  };

  const handleReset = () => {
    reset(ContractFilterValues);
  };

  if (!hasTags) {
    return null;
  }

  return (
    <div className="flex gap-8 flex-wrap justify-start">
      {statuses.map((status, index) => (
        <Chip
          data-cy={`tag-contract-status-${status}`}
          key={`contractStatus-${index}`}
          onClick={() => handleRemoveStatus(status)}
        >
          {getStatusLabel(status)}
        </Chip>
      ))}

      {contractTypeValues.map((type, index) => (
        <Chip
          data-cy={`tag-contract-type-${type}`}
          key={`contractType-${index}`}
          onClick={() => handleRemoveContractType(type)}
        >
          {getContractTypeLabel(type)}
        </Chip>
      ))}

      {leaseTypeValues.map((type, index) => (
        <Chip data-cy={`tag-lease-type-${type}`} key={`leaseType-${index}`} onClick={() => handleRemoveLeaseType(type)}>
          {getLeaseTypeLabel(type)}
        </Chip>
      ))}

      {(startdate || enddate) && (
        <Chip data-cy="tag-contract-dates" onClick={() => handleRemoveDates()}>
          {startdate && !enddate ? 'Från ' : !startdate && enddate ? 'Fram till ' : ''}
          {startdate && dayjs(startdate).format('D MMM YYYY')}
          {startdate && enddate && ' - '}
          {enddate && dayjs(enddate).format('D MMM YYYY')}
        </Chip>
      )}

      <button data-cy="tag-contract-clearAll" className="sk-chip" onClick={() => handleReset()}>
        Rensa alla
      </button>
    </div>
  );
};
