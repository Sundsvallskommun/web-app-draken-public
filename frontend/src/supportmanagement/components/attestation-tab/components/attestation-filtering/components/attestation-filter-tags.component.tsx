import { Admin } from '@common/services/user-service';
import { Chip } from '@sk-web-gui/react';
import {
  AttestationFilter,
  AttestationValues,
} from '@supportmanagement/components/attestation-tab/components/attestation-filtering/attestations-filtering.component';
import { billingrecordStatusToLabel } from '@supportmanagement/services/support-billing-service';
import dayjs from 'dayjs';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

interface AttestationFilterTagsProps {
  administrators: Admin[];
}

export const AttestationFilterTagsComponent: FC<AttestationFilterTagsProps> = () => {
  const { watch, setValue, reset } = useFormContext<AttestationFilter>();
  const statuses = watch('status');
  const invoiceTypes = watch('invoiceType');
  const startdate = watch('startdate');
  const enddate = watch('enddate');

  const hasTags = invoiceTypes?.length > 0 || statuses.length > 0 || startdate || enddate;

  const handleRemoveStatus = (status: string) => {
    const newStatuses = statuses.filter((_c) => _c !== status);
    setValue('status', newStatuses);
  };

  const handleRemoveType = (type: string) => {
    const newTypes = invoiceTypes.filter((_t) => _t !== type);
    setValue('invoiceType', newTypes);
  };

  const handleRemoveDates = () => {
    setValue('startdate', '');
    setValue('enddate', '');
  };

  const handleReset = () => {
    reset(AttestationValues);
  };

  return (
    <div className="flex gap-8 flex-wrap justify-start">
      {statuses.map((status, index) => (
        <Chip key={`status-${index}`} aria-label="Rensa status" onClick={() => handleRemoveStatus(status)}>
          {billingrecordStatusToLabel(status)}
        </Chip>
      ))}
      {invoiceTypes.map((invoiceType, typeIndex) => (
        <Chip key={`type-${typeIndex}`} aria-label="Rensa typ" onClick={() => handleRemoveType(invoiceType)}>
          {invoiceType}
        </Chip>
      ))}

      {(startdate || enddate) && (
        <Chip aria-label="Rensa Tidsperiod" onClick={() => handleRemoveDates()}>
          {startdate && !enddate ? 'Från ' : !startdate && enddate ? 'Fram till ' : ''}
          {startdate && dayjs(startdate).format('D MMM YYYY')}
          {startdate && enddate && ' - '}
          {enddate && dayjs(enddate).format('D MMM YYYY')}
        </Chip>
      )}

      {hasTags && (
        <button className="sk-chip" onClick={() => handleReset()}>
          Rensa alla
        </button>
      )}
    </div>
  );
};
