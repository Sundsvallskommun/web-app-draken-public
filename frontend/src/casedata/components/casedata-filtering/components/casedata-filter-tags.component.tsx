import { ErrandPhasePT } from '@casedata/interfaces/errand-phase';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { Priority } from '@casedata/interfaces/priority';
import {
  assignedStatuses,
  closedStatuses,
  findCaseLabelForCaseType,
  findStatusKeyForStatusLabel,
  newStatuses,
} from '@casedata/services/casedata-errand-service';
import { Admin } from '@common/services/user-service';
import { useAppContext } from '@contexts/app.context';
import { Chip } from '@sk-web-gui/react';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import dayjs from 'dayjs';
import { useFormContext } from 'react-hook-form';
import { CaseDataFilter, CaseDataValues } from '../casedata-filtering.component';

interface CasedataFilterTagsProps {
  administrators: (SupportAdmin | Admin)[];
}

export const CasedataFilterTags: React.FC<CasedataFilterTagsProps> = ({ administrators }) => {
  const { watch, setValue, reset } = useFormContext<CaseDataFilter>();
  const types = watch('caseType');
  const statuses = watch('status');
  const priorities = watch('priority');
  const startdate = watch('startdate');
  const enddate = watch('enddate');
  const admins = watch('admins');
  const propertyDesignation = watch('propertyDesignation');
  const phases = watch('phase');

  const { selectedErrandStatuses }: { selectedErrandStatuses } = useAppContext();

  const hasTags =
    types.length > 0 ||
    statuses.length > 0 ||
    priorities.length > 0 ||
    startdate ||
    enddate ||
    admins.length > 0 ||
    propertyDesignation ||
    phases?.length > 0;

  const handleRemoveType = (type: string) => {
    const newTypes = types.filter((caseType) => caseType !== type);
    setValue('caseType', newTypes);
  };

  const handleRemoveStatus = (status: string) => {
    const newStatuses = statuses.filter((caseStatus) => caseStatus !== status);
    setValue('status', newStatuses);
  };

  const handleRemovePriority = (priority: string) => {
    const newPriorities = priorities.filter((casePrio) => casePrio !== priority);
    setValue('priority', newPriorities);
  };

  const handleRemoveDates = () => {
    setValue('startdate', '');
    setValue('enddate', '');
  };

  const handleRemoveAdmin = (admin: string) => {
    const newAdmins = admins.filter((caseAdmin) => caseAdmin !== admin);
    setValue('admins', newAdmins);
  };

  const handleRemovePropertyDesignation = () => {
    setValue('propertyDesignation', '');
  };

  const handleRemovePhase = (phase: string) => {
    const newPhases = phases.filter((casePhase) => casePhase !== phase);
    setValue('phase', newPhases);
  };

  const getAdminName = (adminId: string) => {
    const fullAdmin = administrators.find((user) => (user?.adAccount?.toString() || user?.id.toString()) === adminId);
    return `${fullAdmin?.firstName} ${fullAdmin?.lastName}`;
  };

  const handleReset = () => {
    reset(CaseDataValues);
    setValue('status', selectedErrandStatuses);
  };

  return (
    <div className="flex gap-8 flex-wrap justify-start">
      {types.map((type, typeIndex) => (
        <Chip data-cy="tag-caseType" key={`caseType-${typeIndex}`} onClick={() => handleRemoveType(type)}>
          {findCaseLabelForCaseType(type)}
        </Chip>
      ))}
      {statuses
        .filter(
          (status) =>
            ![...newStatuses, ...closedStatuses, ...assignedStatuses].map(findStatusKeyForStatusLabel).includes(status)
        )
        .map((status, statusIndex) => (
          <Chip
            data-cy={`tag-status-${status}`}
            key={`caseStatus-${statusIndex}`}
            onClick={() => handleRemoveStatus(status)}
          >
            {ErrandStatus[status]}
          </Chip>
        ))}
      {priorities.map((priority, prioIndex) => (
        <Chip data-cy="tag-prio" key={`casePrio-${prioIndex}`} onClick={() => handleRemovePriority(priority)}>
          {Priority[priority]} prioritet
        </Chip>
      ))}

      {(startdate || enddate) && (
        <Chip data-cy="tag-date" onClick={() => handleRemoveDates()}>
          {startdate && !enddate ? 'Från ' : !startdate && enddate ? 'Fram till ' : ''}
          {startdate && dayjs(startdate).format('D MMM YYYY')}
          {startdate && enddate && ' - '}
          {enddate && dayjs(enddate).format('D MMM YYYY')}
        </Chip>
      )}
      {administrators &&
        admins.map((admin, adminIndex) => (
          <Chip data-cy="tag-admin" key={`caseAdmin-${adminIndex}`} onClick={() => handleRemoveAdmin(admin)}>
            {getAdminName(admin)}
          </Chip>
        ))}

      {propertyDesignation && (
        <Chip
          data-cy={`tag-property-${propertyDesignation}`}
          key={`caseProperty-${propertyDesignation}`}
          onClick={() => handleRemovePropertyDesignation()}
        >
          {propertyDesignation}
        </Chip>
      )}

      {phases &&
        phases.map((phase, phaseIndex) => (
          <Chip data-cy={`tag-phase-${phase}`} key={`casePhase-${phaseIndex}`} onClick={() => handleRemovePhase(phase)}>
            {ErrandPhasePT[phase]}
          </Chip>
        ))}

      {hasTags && (
        <button data-cy="tag-clearAll" className="sk-chip" onClick={() => handleReset()}>
          Rensa alla
        </button>
      )}
    </div>
  );
};
