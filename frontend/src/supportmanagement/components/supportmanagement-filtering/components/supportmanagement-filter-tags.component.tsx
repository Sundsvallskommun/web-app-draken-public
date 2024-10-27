import { useFormContext } from 'react-hook-form';
import { SupportManagementFilter, SupportManagementValues } from '../supportmanagement-filtering.component';
import { Chip } from '@sk-web-gui/react';
import { Channels, Status } from '@supportmanagement/services/support-errand-service';
import dayjs from 'dayjs';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import { Admin } from '@common/services/user-service';
import { Priority } from '@supportmanagement/interfaces/priority';
import { SupportMetadata, SupportType } from '@supportmanagement/services/support-metadata-service';
import { useEffect, useState } from 'react';
import { useAppContext } from '@contexts/app.context';
import { Category, Label } from '@common/data-contracts/supportmanagement/data-contracts';

interface SupportManagementFilterTagsProps {
  administrators: (SupportAdmin | Admin)[];
}

export const SupportManagementFilterTags: React.FC<SupportManagementFilterTagsProps> = ({ administrators }) => {
  const { watch, setValue, reset } = useFormContext<SupportManagementFilter>();
  const categories = watch('category');
  const labelCategories = watch('labelCategory');
  const types = watch('type');
  const labelTypes = watch('labelType');
  const labelSubTypes = watch('labelSubType');
  const channels = watch('channel');
  const priorities = watch('priority');
  const startdate = watch('startdate');
  const enddate = watch('enddate');
  const admins = watch('admins');

  const [allCategories, setAllCategories] = useState<Category[]>();
  const [allTypes, setAllTypes] = useState<SupportType[]>();
  const [allLabelCategories, setAllLabelCategories] = useState<Label[]>();
  const [allLabelTypes, setAllLabelTypes] = useState<string[]>();
  const [allLabelSubTypes, setAllLabelSubTypes] = useState<string[]>();
  const { supportMetadata, selectedErrandStatuses }: { supportMetadata: SupportMetadata; selectedErrandStatuses } =
    useAppContext();

  useEffect(() => {
    setAllCategories(supportMetadata?.categories);
    const _types: SupportType[] = [];
    if (categories.length > 0) {
      categories?.forEach((category) => {
        const categoryTypes = supportMetadata?.categories.find((c) => c.name === category)?.types;
        types.filter((type) => {
          if (!categoryTypes.find((ct) => ct.name === type)) {
            const newTypes = types.filter((_t) => _t !== type);
            setValue('type', newTypes);
          }
        });
        if (categoryTypes) {
          _types.push(...categoryTypes);
        }
      });
    } else {
      supportMetadata?.categories?.forEach((category) => {
        _types.push(...category.types);
      });
    }
    setAllTypes(_types);

    if (supportMetadata?.labels?.labelStructure) {
      setAllLabelCategories(supportMetadata?.labels.labelStructure);
      const _labelTypes: string[] = [];
      const _labelSubTypes: string[] = [];
      if (labelCategories.length > 0) {
        // Some labelCategory is selected, get labelTypes from those
        labelCategories?.forEach((category) => {
          const categoryTypes = supportMetadata?.labels.labelStructure.find((c) => c.name === category)?.labels;
          if (categoryTypes) {
            _labelTypes.push(...categoryTypes.map((l) => l.name));
          }
        });
      } else {
        // No selected labelCategory, get all label types
        supportMetadata?.labels.labelStructure?.forEach((category) => {
          _labelTypes.push(...category.labels.map((l) => l.name));
        });
      }
      setAllLabelTypes(_labelTypes);
      setAllLabelSubTypes(_labelSubTypes);
    }
  }, [supportMetadata, categories, types, labelCategories, labelTypes, labelSubTypes]);

  const hasTags =
    categories.length > 0 ||
    labelCategories.length > 0 ||
    labelTypes.length > 0 ||
    types.length > 0 ||
    priorities.length > 0 ||
    startdate ||
    enddate ||
    admins.length > 0;

  const handleRemoveCategory = (category: string) => {
    const newCategories = categories.filter((_c) => _c !== category);
    setValue('category', newCategories);
  };

  const handleRemoveLabelCategory = (category: string) => {
    const newCategories = labelCategories.filter((_c) => _c !== category);
    setValue('labelCategory', newCategories);
  };

  const handleRemoveType = (type: string) => {
    const newTypes = types.filter((_t) => _t !== type);
    setValue('type', newTypes);
  };

  const handleRemoveLabelType = (type: string) => {
    const newTypes = labelTypes.filter((_t) => _t !== type);
    setValue('labelType', newTypes);
  };

  const handleRemoveLabelSubType = (type: string) => {
    const newSubTypes = labelSubTypes.filter((_t) => _t !== type);
    setValue('labelSubType', newSubTypes);
  };

  const handleRemoveChannel = (channel: string) => {
    const newChannels = channels.filter((caseChannel) => caseChannel !== channel);
    setValue('channel', newChannels);
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

  const getAdminName = (adminId: string) => {
    const fullAdmin = administrators.find((user) => (user?.adAccount?.toString() || user?.id.toString()) === adminId);
    return `${fullAdmin?.firstName} ${fullAdmin?.lastName}`;
  };

  const handleReset = () => {
    reset(SupportManagementValues);
    setValue('status', [selectedErrandStatuses]);
  };

  return (
    <div className="flex gap-8 flex-wrap justify-start">
      {categories.map((category, categoryIndex) => (
        <Chip
          key={`category-${categoryIndex}`}
          aria-label="Rensa verksamhet"
          onClick={() => handleRemoveCategory(category)}
        >
          {allCategories?.find((c) => c.name === category)?.displayName}
        </Chip>
      ))}
      {labelCategories.map((category, categoryIndex) => (
        <Chip
          key={`labelCategory-${categoryIndex}`}
          aria-label="Rensa verksamhet"
          onClick={() => handleRemoveLabelCategory(category)}
        >
          {allLabelCategories?.find((c) => c.name === category)?.displayName}
        </Chip>
      ))}
      {types.map((type, typeIndex) => (
        <Chip key={`caseType-${typeIndex}`} aria-label="Rensa ärendetyp" onClick={() => handleRemoveType(type)}>
          {allTypes?.find((t) => t.name === type)?.displayName}
        </Chip>
      ))}
      {labelTypes.map((labelType, typeIndex) => (
        <Chip
          key={`labelType-${typeIndex}`}
          aria-label="Rensa ärendetyp"
          onClick={() => handleRemoveLabelType(labelType)}
        >
          {labelType}
        </Chip>
      ))}
      {labelSubTypes.map((labelSubType, typeIndex) => (
        <Chip
          key={`labelSubType-${typeIndex}`}
          aria-label="Rensa ärendesubtyp"
          onClick={() => handleRemoveLabelSubType(labelSubType)}
        >
          {labelSubType}
        </Chip>
      ))}
      {channels.map((channel, channelIndex) => (
        <Chip key={`caseChannel-${channelIndex}`} aria-label="Rensa Kanal" onClick={() => handleRemoveChannel(channel)}>
          {Channels[channel]}
        </Chip>
      ))}
      {priorities.map((priority, prioIndex) => (
        <Chip key={`casePrio-${prioIndex}`} aria-label="Rensa prioritet" onClick={() => handleRemovePriority(priority)}>
          {Priority[priority]} prioritet
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
      {administrators &&
        admins.map((admin, adminIndex) => (
          <Chip aria-label="Rensa Handläggare" key={`caseAdmin-${adminIndex}`} onClick={() => handleRemoveAdmin(admin)}>
            {getAdminName(admin)}
          </Chip>
        ))}

      {hasTags && (
        <button className="sk-chip" onClick={() => handleReset()}>
          Rensa alla
        </button>
      )}
    </div>
  );
};
