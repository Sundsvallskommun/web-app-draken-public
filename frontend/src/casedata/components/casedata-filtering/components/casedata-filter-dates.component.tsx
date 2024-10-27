import { Priority } from '@casedata/interfaces/priority';
import { getPriorityColor } from '@casedata/services/casedata-errand-service';
import { PopupMenu, LucideIcon as Icon, Checkbox, DatePicker, Button } from '@sk-web-gui/react';
import { useFormContext } from 'react-hook-form';
import { CasePriorityFilter } from './casedata-filter-priority.component';
import dayjs from 'dayjs';
import { useState } from 'react';

export interface CaseDatesFilter {
  startdate: string;
  enddate: string;
}

export const CaseDatesValues = {
  startdate: '',
  enddate: '',
};

export const CasedataFilterDates: React.FC = () => {
  const [open, setOpen] = useState<boolean>(false);
  const { setValue, watch } = useFormContext<CaseDatesFilter>();

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
        rightIcon={<Icon name="chevron-down" />}
        data-cy="Tidsperiod-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Tidsperiod
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full">
        <DatePicker
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          data-cy="casedata-validFrom-input"
          max={dayjs(endDate).format('YYYY-MM-DD')}
        />
        <DatePicker
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          data-cy="casedata-validTo-input"
          min={startDate ? dayjs(startDate).format('YYYY-MM-DD') : null}
        />
        <Button onClick={() => handleApply()}>Visa tidsperiod</Button>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
