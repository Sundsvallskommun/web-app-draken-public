import { baseDetails } from '@casedata/components/errand/extraparameter-templates/base-template';
import { mexUnauthorizedResidence_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-anauthorized-residence';
import { mexApplicationForRoadAllowance_UppgiftFieldTempalte } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-application-for-road-allowance';
import { mexBuyLandFromTheMunicipality_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-buy-land-from-the-municipality';
import { mexBuySmallHousePlot_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-buy-small-house-plot';
import { mexHuntingLease_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-hunting-lease';
import { mexInvoice_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-invoice';
import { mexLandInstruction_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-land-instructions';
import { mexLandRight_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-land-right';
import { mexLandSurveyingOffice_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-land-surveying-office';
import { mexLeaseRequest_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-lease-request';
import { mexOther_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-other';
import { mexProtectiveHunting_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-protective-hunting';
import { mexReferralBuildingPermitEarlyDialoguePlanningNotice_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-referral-building-permit-early-dialogue-planning-notice';
import { mexRequestForPublicDocument_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-request-public-document';
import { mexSellLandToTheMunicipality_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-sell-land-to-the-municipality';
import { mexSquarePlace_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-square-place';
import { mexTerminationOfLease_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/mex-templates/mex-termination-of-lease';
import { notification_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/paratransit-templates/paratransit-notification';
import { notificationBusCard_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/paratransit-templates/paratransit-notification-bus-card';
import { notificationNational_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/paratransit-templates/paratransit-notification-national';
import { notificationRenewal_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/paratransit-templates/paratransit-notification-renewal';
import { notificationRiak_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/paratransit-templates/paratransit-notification-riak';
import { parkingPermitAppeal_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/parkingpermit-templates/parkingpermit-appeal';
import { lostParkingPermit_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/parkingpermit-templates/parkingpermit-lost-parking-permit';
import { parkingPermit_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/parkingpermit-templates/parkingpermit-parkingpermit';
import { parkingPermitRenewal_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/parkingpermit-templates/parkingpermit-renewal';
import { IErrand } from '@casedata/interfaces/errand';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { apiService } from '@common/services/api-service';
import escapeStringRegexp from 'escape-string-regexp';
import { PROCESS_PARAMETER_KEYS } from './process-service';

export const EXTRAPARAMETER_SEPARATOR = '@';

export const groupRepeatableParameters = (
  extraParameters: ExtraParameter[],
  basePath: string
): Record<number, Record<string, string | string[]>> => {
  const grouped: Record<number, Record<string, string | string[]>> = {};

  // Handle case where extraParameters is undefined or not an array
  if (!extraParameters || !Array.isArray(extraParameters)) {
    return grouped;
  }

  const escapedBasePath = escapeStringRegexp(basePath);
  const pattern = new RegExp(`^${escapedBasePath}\\.(\\d+)\\.(.+)$`);

  extraParameters.forEach((param) => {
    const match = param.key.match(pattern);
    if (match) {
      const index = parseInt(match[1], 10);
      const fieldKey = match[2];

      if (!grouped[index]) {
        grouped[index] = {};
      }

      // Keep arrays for multi-value fields (combobox), single value for others
      const values = param.values ?? [];
      grouped[index][fieldKey] = values.length > 1 ? values : values[0] ?? '';
    }
  });

  return grouped;
};

// Example: "personal@journey@0@destination" -> { key: "personal.journey.0.destination", values: ["Stockholm"] }
export const extractRepeatableGroupData = (rawValues: Record<string, unknown>, basePath: string): ExtraParameter[] => {
  const extracted: ExtraParameter[] = [];
  const formKeyPrefix = basePath.replaceAll('.', EXTRAPARAMETER_SEPARATOR);
  const escapedPrefix = escapeStringRegexp(formKeyPrefix);
  const escapedSeparator = escapeStringRegexp(EXTRAPARAMETER_SEPARATOR);
  const pattern = new RegExp(`^${escapedPrefix}${escapedSeparator}(\\d+)${escapedSeparator}(.+)$`);

  Object.keys(rawValues).forEach((key) => {
    const match = key.match(pattern);
    if (match) {
      const index = match[1];
      const fieldName = match[2];
      const value = rawValues[key];

      const backendKey = `${basePath}.${index}.${fieldName}`;
      extracted.push({
        key: backendKey,
        values: Array.isArray(value) ? value : [String(value ?? '')],
      });
    }
  });

  return extracted;
};

export type OptionBase = {
  label: string;
  value: string;
  name?: string;
};
export interface UppgiftField {
  field: string;
  value: string | string[];
  label: string;
  formField:
    | { type: 'text'; options?: { placeholder?: string; minLength?: number; maxLength?: number } }
    | { type: 'date'; options?: { min?: string; max?: string } }
    | { type: 'datetime-local'; options?: { min?: string; max?: string } }
    | { type: 'textarea'; options?: { placeholder?: string } }
    | { type: 'combobox'; options: OptionBase[] }
    | { type: 'select'; options: OptionBase[] }
    | { type: 'radio'; options: OptionBase[]; inline?: boolean }
    | { type: 'radioPlus'; options: OptionBase[]; ownOption: string }
    | { type: 'checkbox'; options: OptionBase[] }
    | { type: 'repeatableGroup' };
  section: string;
  dependsOnLogic?: 'AND' | 'OR';
  dependsOn?: {
    field: string;
    value: string | string[];
    validationMessage?: string;
  }[];
  description?: string;
  required?: boolean;
  pairWith?: string;
  repeatableGroup?: any;
}

const caseTypeTemplateAlias: Record<string, string> = {
  PARATRANSIT: 'PARATRANSIT_NOTIFICATION',
  PARATRANSIT_RENEWAL: 'PARATRANSIT_NOTIFICATION_RENEWAL',
  PARATRANSIT_NATIONAL: 'PARATRANSIT_NOTIFICATION_NATIONAL',
  PARATRANSIT_RIAK: 'PARATRANSIT_NOTIFICATION_RIAK',
  PARATRANSIT_BUS_CARD: 'PARATRANSIT_NOTIFICATION_BUS_CARD',
};

export interface ExtraParametersObject {
  [key: string]: UppgiftField[] | undefined;
}

const template: ExtraParametersObject = {
  PARATRANSIT: notification_UppgiftFieldTemplate,
  PARATRANSIT_RENEWAL: notificationRenewal_UppgiftFieldTemplate,
  PARATRANSIT_NATIONAL: notificationNational_UppgiftFieldTemplate,
  PARATRANSIT_RIAK: notificationRiak_UppgiftFieldTemplate,
  PARATRANSIT_BUS_CARD: notificationBusCard_UppgiftFieldTemplate,

  PARATRANSIT_NOTIFICATION: notification_UppgiftFieldTemplate,
  PARATRANSIT_NOTIFICATION_RENEWAL: notificationRenewal_UppgiftFieldTemplate,
  PARATRANSIT_NOTIFICATION_NATIONAL: notificationNational_UppgiftFieldTemplate,
  PARATRANSIT_NOTIFICATION_RIAK: notificationRiak_UppgiftFieldTemplate,
  PARATRANSIT_NOTIFICATION_BUS_CARD: notificationBusCard_UppgiftFieldTemplate,

  ANMALAN_ATTEFALL: [],
  MEX_LEASE_REQUEST: mexLeaseRequest_UppgiftFieldTemplate,
  MEX_BUY_LAND_FROM_THE_MUNICIPALITY_PRIVATE: mexBuyLandFromTheMunicipality_UppgiftFieldTemplate,
  MEX_BUY_LAND_FROM_THE_MUNICIPALITY_BUSINESS: mexBuyLandFromTheMunicipality_UppgiftFieldTemplate,
  MEX_SELL_LAND_TO_THE_MUNICIPALITY: mexSellLandToTheMunicipality_UppgiftFieldTemplate,
  MEX_SQUARE_PLACE: mexSquarePlace_UppgiftFieldTemplate,
  MEX_APPLICATION_FOR_ROAD_ALLOWANCE: mexApplicationForRoadAllowance_UppgiftFieldTempalte,
  MEX_UNAUTHORIZED_RESIDENCE: mexUnauthorizedResidence_UppgiftFieldTemplate,
  MEX_LAND_RIGHT: mexLandRight_UppgiftFieldTemplate,
  MEX_PROTECTIVE_HUNTING: mexProtectiveHunting_UppgiftFieldTemplate,
  MEX_LAND_INSTRUCTION: mexLandInstruction_UppgiftFieldTemplate,
  MEX_OTHER: mexOther_UppgiftFieldTemplate,
  MEX_LAND_SURVEYING_OFFICE: mexLandSurveyingOffice_UppgiftFieldTemplate,
  MEX_INVOICE: mexInvoice_UppgiftFieldTemplate,
  MEX_REQUEST_FOR_PUBLIC_DOCUMENT: mexRequestForPublicDocument_UppgiftFieldTemplate,
  MEX_TERMINATION_OF_LEASE: mexTerminationOfLease_UppgiftFieldTemplate,
  MEX_HUNTING_LEASE: mexHuntingLease_UppgiftFieldTemplate,

  PARKING_PERMIT: parkingPermit_UppgiftFieldTemplate,
  LOST_PARKING_PERMIT: lostParkingPermit_UppgiftFieldTemplate,
  PARKING_PERMIT_RENEWAL: parkingPermitRenewal_UppgiftFieldTemplate,
  APPEAL: parkingPermitAppeal_UppgiftFieldTemplate,

  //Legacy: needed to view templates regarding extraparameters for old casetypes that has been expired.
  MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOGUE_PLANNING_NOTICE:
    mexReferralBuildingPermitEarlyDialoguePlanningNotice_UppgiftFieldTemplate,
  MEX_BUY_SMALL_HOUSE_PLOT: mexBuySmallHousePlot_UppgiftFieldTemplate,
  MEX_BUY_LAND_FROM_THE_MUNICIPALITY: mexBuyLandFromTheMunicipality_UppgiftFieldTemplate,
};

export const getExtraParametersLabels = (caseType: string): { [key: string]: string } => {
  return template[caseType]?.reduce((acc, field) => {
    acc[field.field] = field.label;
    return acc;
  }, {});
};

export const extraParametersToUppgiftMapper: (errand: IErrand) => Partial<UppgiftField[]> = (errand) => {
  // Create base template encompassing all case types
  const obj: Partial<ExtraParametersObject> = { ...template };

  // For this particular errand, populate the fields with values from extraParameters
  // Loop through all extraParameters and find the corresponding template field
  // and populate the value.
  // If the field is not found in the errand extraparameters, the default value
  // from the template will be used.

  const caseType = errand.caseType;
  const resolvedCaseType = caseTypeTemplateAlias[caseType] ?? caseType;
  const caseTypeTemplate = (template[resolvedCaseType] as UppgiftField[]) || baseDetails;

  obj[caseType] = caseTypeTemplate?.map((field) => ({ ...field })) || [];

  // First: handle repeatable groups
  caseTypeTemplate?.forEach((templateField) => {
    if (templateField.formField.type === 'repeatableGroup' && (templateField as any).repeatableGroup) {
      const basePath = (templateField as any).repeatableGroup.basePath;
      const groupedData = groupRepeatableParameters(errand.extraParameters, basePath);

      if (Object.keys(groupedData).length > 0) {
        const a: UppgiftField[] = obj[caseType];
        const i = a.findIndex((f) => f.field === templateField.field);

        if (i > -1) {
          (obj[caseType][i] as any).initialData = groupedData;
        }
      }
    }
  });

  // Second: handle regular fields
  errand.extraParameters.forEach((param) => {
    try {
      const field = param['key'];

      // Skip fields that are part of repeatable groups
      if (/\.\d+\./.test(field)) {
        return;
      }

      const templateField = caseTypeTemplate?.find((f) => f.field === field);

      if (field && templateField) {
        const { label, formField, section, dependsOn, dependsOnLogic, description, required } = templateField;
        const isCheckbox = formField.type === 'checkbox';
        const isMultiValueField = isCheckbox || Array.isArray(templateField.value);
        // If the field is a checkbox, its values are in a string formatted
        // comma-separated list in the first element of the param.values array
        const rawValues = Array.isArray(param.values) ? param.values : [];
        const normalized = rawValues
          .flatMap((v) => (typeof v === 'string' ? v.split(',') : []))
          .map((v) => v.trim())
          .filter(Boolean);

        const value = isMultiValueField ? normalized : rawValues[0] ?? '';

        const data: UppgiftField = {
          field,
          value,
          label,
          formField,
          section,
          dependsOn,
          dependsOnLogic,
          description,
          required,
        };

        const a: UppgiftField[] = obj[caseType];
        const i = a.findIndex((f) => f.field === field);
        if (i > -1) {
          obj[caseType][i] = data;
        } else {
          obj[caseType].push(data);
        }
      }
    } catch (error) {
      console.warn('Could not map extraParameter:', param, error);
    }
  });

  return obj[errand.caseType];
};

export const saveExtraParameters = (data: ExtraParameter[], errand: IErrand) => {
  // This function must not include process-related extra parameters since most of these
  // are read-only and managed by the process-service. Hence the filter for PROCESS_PARAMETER_KEYS.
  const sanitizedParameters: ExtraParameter[] = data
    .filter((p) => !PROCESS_PARAMETER_KEYS.includes(p.key))
    .map((param) => ({
      ...param,
      values: (param.values ?? [])
        .map((value) => (value === null || typeof value === 'undefined' ? '' : String(value).trim()))
        .filter((value) => value !== ''),
    }));

  const repeatableGroupPaths = new Set<string>();
  sanitizedParameters.forEach((param) => {
    const match = param.key.match(/^(.+)\.\d+\..+$/);
    if (match) {
      repeatableGroupPaths.add(match[1]);
    }
  });

  const mergedExtraParameters = errand.extraParameters
    .filter((existing) => {
      if (sanitizedParameters.some((param) => param.key === existing.key)) {
        return false;
      }

      // Remove if it's part of a repeatable group that we're updating
      for (const basePath of repeatableGroupPaths) {
        const escapedBasePath = escapeStringRegexp(basePath);
        const pattern = new RegExp(`^${escapedBasePath}\\.\\d+\\..+$`);
        if (pattern.test(existing.key)) {
          return false;
        }
      }

      return true;
    })
    .concat(sanitizedParameters)
    .filter((p) => !PROCESS_PARAMETER_KEYS.includes(p.key));

  return apiService.patch<any, ExtraParameter[]>(
    `casedata/errands/${errand.id}/extraparameters`,
    mergedExtraParameters
  );
};

// If parameter exists, replace the existing one, otherwise append to list
export const replaceExtraParameter = (extraParameters: ExtraParameter[], newParameter: ExtraParameter) => {
  return extraParameters.some((p) => p.key === newParameter.key)
    ? extraParameters.map((p) => (p.key === newParameter.key ? newParameter : p))
    : [...extraParameters, newParameter];
};
