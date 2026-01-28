import { baseDetails } from '@casedata/components/errand/extraparameter-templates/base-template';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { getErrand, saveErrand, updateErrandStatus } from '@casedata/services/casedata-errand-service';
import {
  extractRepeatableGroupData,
  EXTRAPARAMETER_SEPARATOR,
  extraParametersToUppgiftMapper,
  saveExtraParameters,
  UppgiftField,
} from '@casedata/services/casedata-extra-parameters-service';
import { saveFacilities } from '@casedata/services/casedata-facilities-service';
import { editStakeholder, removeStakeholder, setAdministrator } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@common/contexts/app.context';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { FacilityDTO } from '@common/interfaces/facilities';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { appConfig } from '@config/appconfig';
import { useSnackbar } from '@sk-web-gui/react';
import { useFormContext } from 'react-hook-form';

export function useSaveCasedataErrand(registeringNewErrand: boolean = false) {
  const { errand, administrators, setErrand, user } = useAppContext();
  const toastMessage = useSnackbar();
  const { getValues, reset, formState, trigger } = useFormContext<IErrand>();

  async function saveCaseDetails(data: IErrand): Promise<ExtraParameter[] | null> {
    if (!errand.extraParameters) {
      return [];
    }
    const uppgifterFields: UppgiftField[] = extraParametersToUppgiftMapper(data) || baseDetails;
    const fieldNames = uppgifterFields.map((f) =>
      f.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR)
    ) as (keyof IErrand)[];
    fieldNames.push('propertyDesignation' as keyof IErrand);

    const isValid = await trigger(fieldNames);

    if (!isValid) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Fyll i alla obligatoriska fält i ärendeuppgifterna innan du sparar',
        status: 'error',
      });

      const firstInvalid = fieldNames.find((name) => formState.errors[name]);
      const el = document.querySelector(`[name="${firstInvalid}"]`) as HTMLElement;
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus?.();
      }

      return null;
    }

    if (appConfig.features.useFacilities) {
      const facilities = getValues('facilities');
      const validFacilities: FacilityDTO[] = facilities.map((f) => ({
        ...f,
        address: {
          ...f.address,
          propertyDesignation: f.address?.propertyDesignation ?? '',
        },
      }));

      if (errand.id) {
        try {
          await saveFacilities(errand.id, validFacilities);
        } catch (e) {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Kunde inte spara fastighetsinformation',
            status: 'error',
          });
          return null;
        }
      }
    }

    // Extract regular fields
    const regularFields: ExtraParameter[] = fieldNames
      .filter((fieldName) => {
        // Skip repeatable group parent fields (they don't have values themselves)
        // Example: Parent field (personal.journey), this is the wrapper for repeatable group
        // Example: Child fields (personal.journey.0.travelFromMunicipality)
        const field = uppgifterFields.find((f) => f.field.replaceAll('.', EXTRAPARAMETER_SEPARATOR) === fieldName);
        return field && field.formField.type !== 'repeatableGroup';
      })
      .map((fieldName) => {
        const rawValue = getValues()[fieldName];
        const values: string[] = Array.isArray(rawValue)
          ? rawValue.map((v) => String(v)).filter((v) => v.trim() !== '')
          : typeof rawValue === 'string'
          ? [rawValue.trim()]
          : rawValue != null
          ? [String(rawValue).trim()]
          : [];
        return {
          key: fieldName.replaceAll(EXTRAPARAMETER_SEPARATOR, '.'),
          values,
        };
      });

    const repeatableGroupFields: ExtraParameter[] = [];
    uppgifterFields.forEach((field) => {
      if (field.formField.type === 'repeatableGroup' && (field as any).repeatableGroup) {
        const basePath = (field as any).repeatableGroup.basePath;
        const groupData = extractRepeatableGroupData(getValues() as unknown as Record<string, unknown>, basePath);
        repeatableGroupFields.push(...groupData);
      }
    });

    const extraParams = [...regularFields, ...repeatableGroupFields];

    await saveExtraParameters(extraParams, errand);
    return extraParams;
  }

  async function save(): Promise<boolean> {
    const data: IErrand = getValues();

    const extraParams = await saveCaseDetails(data);
    if (extraParams === null) return false;

    let dataToSave: Partial<IErrand> & { municipalityId: string };

    if (registeringNewErrand) {
      const { administrator, ...rest } = data;
      dataToSave = rest;
    } else {
      const dirtyData = {
        id: data.id,
        municipalityId: data.municipalityId,
        ...Object.entries(formState.dirtyFields).reduce((acc, [field, dirty]) => {
          if (dirty) acc[field] = data[field];
          return acc;
        }, {} as any),
      };
      delete dirtyData.administrator;
      dataToSave = dirtyData;
    }

    if (formState.dirtyFields['administratorName']) {
      const admin = administrators.find((a) => a.displayName === getValues().administratorName);
      if (!!admin) {
        setAdministrator(errand, admin);
        if (admin.adAccount !== user.username) {
          updateErrandStatus(errand.id.toString(), ErrandStatus.Tilldelat);
        }
      }
    }

    try {
      if (dataToSave.stakeholders) {
        for (const stakeholder of dataToSave.stakeholders) {
          if (stakeholder.id && !stakeholder.removed && stakeholder.newRole !== 'ADMINISTRATOR') {
            await editStakeholder(dataToSave.id.toString(), stakeholder);
          }
        }
      }

      const res = await saveErrand(dataToSave);
      await getErrand(res.errandId.toString());

      const removedStakeholders = (dataToSave.stakeholders ?? []).filter((s) => s.removed);
      for (const removed of removedStakeholders) {
        await removeStakeholder(res.errandId.toString(), removed.id);
      }
      const saved2 = await getErrand(res.errandId.toString());
      setErrand(saved2.errand);

      if (registeringNewErrand) {
        reset();
      }

      toastMessage(
        getToastOptions({
          message: 'Ärendet sparades',
          status: 'success',
        })
      );

      return true;
    } catch (e) {
      console.error('Error when saving errand:', e);
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när ärendet sparades',
        status: 'error',
      });
      return false;
    }
  }

  return save;
}
