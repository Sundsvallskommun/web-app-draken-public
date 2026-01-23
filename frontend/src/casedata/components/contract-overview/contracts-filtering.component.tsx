import { ContractType, Status } from '@casedata/interfaces/contracts';
import { contractTypes, leaseTypes } from '@casedata/services/contract-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Checkbox, cx, DatePicker, PopupMenu, SearchField } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface ContractFilter {
  query: string;
  status: string[];
  contractType: string[];
  leaseType: string[];
  startdate: string;
  enddate: string;
}

export const ContractFilterValues: ContractFilter = {
  query: '',
  status: [],
  contractType: [],
  leaseType: [],
  startdate: '',
  enddate: '',
};

const statusOptions = [
  { label: 'Utkast', value: Status.DRAFT },
  { label: 'Aktiv', value: Status.ACTIVE },
  { label: 'Avslutad', value: Status.TERMINATED },
];

const contractTypeOptions = contractTypes.map((t) => ({
  label: t.label,
  value: t.key,
}));

const leaseTypeOptions = leaseTypes.map((t) => ({
  label: t.label,
  value: t.key,
}));

export const ContractFilterStatusComponent: React.FC = () => {
  const { register } = useFormContext<ContractFilter>();

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="contract-status-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Avtalsstatus
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full max-h-[70vh] h-auto overflow-y-auto">
        <PopupMenu.Items autoFocus={false}>
          {statusOptions.map((status, index) => (
            <PopupMenu.Item key={`${status.value}-${index}`}>
              <Checkbox
                labelPosition="left"
                value={status.value}
                {...register('status')}
                data-cy={`contract-status-filter-${status.value}`}
              >
                {status.label}
              </Checkbox>
            </PopupMenu.Item>
          ))}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};

export const ContractFilterTypeComponent: React.FC = () => {
  const { register } = useFormContext<ContractFilter>();

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="contract-type-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Avtalstyp
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full max-h-[70vh] h-auto overflow-y-auto">
        <PopupMenu.Items autoFocus={false}>
          {contractTypeOptions.map((type, index) => (
            <PopupMenu.Item key={`${type.value}-${index}`}>
              <Checkbox
                labelPosition="left"
                value={type.value}
                {...register('contractType')}
                data-cy={`contract-type-filter-${type.value}`}
              >
                {type.label}
              </Checkbox>
            </PopupMenu.Item>
          ))}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};

export const ContractFilterLeaseTypeComponent: React.FC = () => {
  const { register } = useFormContext<ContractFilter>();

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="contract-lease-type-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Avtals-subtyp
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full max-h-[70vh] h-auto overflow-y-auto">
        <PopupMenu.Items autoFocus={false}>
          {leaseTypeOptions.map((type, index) => (
            <PopupMenu.Item key={`${type.value}-${index}`}>
              <Checkbox
                labelPosition="left"
                value={type.value}
                {...register('leaseType')}
                data-cy={`contract-lease-type-filter-${type.value}`}
              >
                {type.label}
              </Checkbox>
            </PopupMenu.Item>
          ))}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};

export const ContractFilterDatesComponent: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const { setValue, watch } = useFormContext<ContractFilter>();

  const [startDate, setStartDate] = useState<string>(watch('startdate'));
  const [endDate, setEndDate] = useState<string>(watch('enddate'));

  const handleApply = () => {
    setValue('startdate', startDate);
    setValue('enddate', endDate);
    setOpen(false);
  };

  return (
    <PopupMenu type="dialog" open={open} onToggleOpen={setOpen}>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="contract-dates-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Avtalsperiod
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full">
        <DatePicker
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          data-cy="contract-filter-startdate"
          max={endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined}
        />
        <DatePicker
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          data-cy="contract-filter-enddate"
          min={startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined}
        />
        <Button data-cy="contract-dates-apply" onClick={() => handleApply()}>
          Visa avtalsperiod
        </Button>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};

export const ContractFilterQueryComponent: React.FC = () => {
  const { watch, setValue } = useFormContext<ContractFilter>();
  const value = watch('query');
  const [query, setQuery] = useState<string>(value);

  useEffect(() => {
    if (query === '') {
      setValue('query', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <SearchField
      value={query}
      size="md"
      data-cy="contract-query-filter"
      showSearchButton
      onChange={(e) => {
        setQuery(e.target.value);
      }}
      className="flex-grow max-w-full"
      onSearch={() => setValue('query', query)}
      onReset={() => {
        setQuery('');
        setValue('query', '');
      }}
      title="Sök"
      placeholder="Sök avtal"
    />
  );
};

export const ContractsFilteringComponent: React.FC = () => {
  const [show, setShow] = useState<boolean>(true);

  return (
    <div className="flex flex-col w-full gap-16 py-19">
      <div className="w-full flex items-start md:items-center justify-between md:flex-row gap-16">
        <div className="w-full">
          <ContractFilterQueryComponent />
        </div>
        <div className="flex gap-16">
          <Button
            className="w-full md:w-auto"
            onClick={() => setShow(!show)}
            data-cy="show-filters-button"
            color="vattjom"
            variant={show ? 'tertiary' : 'primary'}
            inverted={!show}
            leftIcon={<LucideIcon name="list-filter" size="1.8rem" />}
          >
            {show ? 'Dölj filter' : 'Visa filter'}
          </Button>
        </div>
      </div>

      <div className={cx(show ? 'visible' : 'hidden')}>
        <div className="flex gap-16 items-center">
          <div className="w-full flex flex-col md:flex-row justify-start items-center p-10 gap-4 bg-background-200 rounded-groups flex-wrap">
            <div className="relative max-md:w-full">
              <ContractFilterTypeComponent />
            </div>

            <div className="relative max-md:w-full">
              <ContractFilterLeaseTypeComponent />
            </div>

            <div className="relative max-md:w-full">
              <ContractFilterDatesComponent />
            </div>

            <div className="relative max-md:w-full">
              <ContractFilterStatusComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractsFilteringComponent;
