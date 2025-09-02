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
import { notificationChange_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/paratransit-templates/paratransit-notification-change';
import { notificationNational_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/paratransit-templates/paratransit-notification-national';
import { notificationNationalRenewal_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/paratransit-templates/paratransit-notification-national-renewal';
import { notificationRenewal_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/paratransit-templates/paratransit-notification-renewal';
import { notificationRiak_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/paratransit-templates/paratransit-notification-riak';
import { parkingPermitAppeal_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/parkingpermit-templates/parkingpermit-appeal';
import { lostParkingPermit_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/parkingpermit-templates/parkingpermit-lost-parking-permit';
import { parkingPermit_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/parkingpermit-templates/parkingpermit-parkingpermit';
import { parkingPermitRenewal_UppgiftFieldTemplate } from '@casedata/components/errand/extraparameter-templates/parkingpermit-templates/parkingpermit-renewal';
import { IErrand } from '@casedata/interfaces/errand';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { apiService } from '@common/services/api-service';

export const EXTRAPARAMETER_SEPARATOR = '@';

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
    | { type: 'select'; options: OptionBase[] }
    | { type: 'radio'; options: OptionBase[]; inline?: boolean }
    | { type: 'radioPlus'; options: OptionBase[]; ownOption: string }
    | { type: 'checkbox'; options: OptionBase[] };
  section: string;
  dependsOn?: {
    field: string;
    value: string;
    validationMessage?: string;
  }[];
  description?: string;
}

const caseTypeTemplateAlias: Record<string, string> = {
  PARATRANSIT: 'PARATRANSIT_NOTIFICATION',
  PARATRANSIT_CHANGE: 'PARATRANSIT_NOTIFICATION_CHANGE',
  PARATRANSIT_RENEWAL: 'PARATRANSIT_NOTIFICATION_RENEWAL',
  PARATRANSIT_NATIONAL: 'PARATRANSIT_NOTIFICATION_NATIONAL',
  PARATRANSIT_NATIONAL_RENEWAL: 'PARATRANSIT_NOTIFICATION_NATIONAL_RENEWAL',
  PARATRANSIT_RIAK: 'PARATRANSIT_NOTIFICATION_RIAK',
  PARATRANSIT_BUS_CARD: 'PARATRANSIT_NOTIFICATION_BUS_CARD',
};

export interface ExtraParametersObject {
  [key: string]: UppgiftField[] | undefined;
}

const template: ExtraParametersObject = {
  PARATRANSIT: notification_UppgiftFieldTemplate,
  PARATRANSIT_CHANGE: notificationChange_UppgiftFieldTemplate,
  PARATRANSIT_RENEWAL: notificationRenewal_UppgiftFieldTemplate,
  PARATRANSIT_NATIONAL: notificationNational_UppgiftFieldTemplate,
  PARATRANSIT_NATIONAL_RENEWAL: notificationNationalRenewal_UppgiftFieldTemplate,
  PARATRANSIT_RIAK: notificationRiak_UppgiftFieldTemplate,
  PARATRANSIT_BUS_CARD: notificationBusCard_UppgiftFieldTemplate,

  PARATRANSIT_NOTIFICATION: notification_UppgiftFieldTemplate,
  PARATRANSIT_NOTIFICATION_CHANGE: notificationChange_UppgiftFieldTemplate,
  PARATRANSIT_NOTIFICATION_RENEWAL: notificationRenewal_UppgiftFieldTemplate,
  PARATRANSIT_NOTIFICATION_NATIONAL: notificationNational_UppgiftFieldTemplate,
  PARATRANSIT_NOTIFICATION_NATIONAL_RENEWAL: notificationNationalRenewal_UppgiftFieldTemplate,
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

export const extraParametersToUppgiftMapper: (errand: IErrand) => Partial<ExtraParametersObject> = (errand) => {
  // Create base template encompassing all case types
  const obj: Partial<ExtraParametersObject> = { ...template };

  // For this particular errand, populate the fields with values from extraParameters
  // Loop through all extraParameters and find the corresponding template field
  // and populate the value.
  // If the field is not found in the errand extraparameters, the default value
  // from the template will be used.

  errand.extraParameters.forEach((param) => {
    try {
      const caseType = errand.caseType;
      const field = param['key'];

      const resolvedCaseType = caseTypeTemplateAlias[caseType] ?? caseType;
      const caseTypeTemplate = (template[resolvedCaseType] as UppgiftField[]) || baseDetails;
      const templateField = caseTypeTemplate?.find((f) => f.field === field);

      if (caseType && field && templateField) {
        const { label, formField, section, dependsOn } = templateField;
        const isCheckbox = formField.type === 'checkbox';
        // If the field is a checkbox, its values are in a string formatted
        // comma-separated list in the first element of the param.values array
        const rawValues = Array.isArray(param.values) ? param.values : [];
        const normalized = rawValues
          .flatMap((v) => (typeof v === 'string' ? v.split(',') : []))
          .map((v) => v.trim())
          .filter(Boolean);

        const value = isCheckbox ? normalized : rawValues[0] ?? '';

        obj[caseType] = obj[caseType] || [];
        const data: UppgiftField = {
          field,
          value,
          label,
          formField,
          section,
          dependsOn,
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
      console.warn('Kunde inte mappa extraParameter:', param, error);
    }
  });

  return obj;
};

export const saveExtraParameters = (municipalityId: string, data: ExtraParameter[], errand: IErrand) => {
  const nullFilteredData: ExtraParameter[] = data
    .filter((d) => d.values[0] !== null && typeof d.values[0] !== 'undefined')
    .map((param) => ({
      ...param,
      values: param.values.flatMap((v) => (typeof v === 'string' ? [v] : [])),
    }));

  let newExtraParameters = [...errand.extraParameters];
  nullFilteredData.forEach((p) => {
    newExtraParameters = replaceExtraParameter(newExtraParameters, p);
  });
  return apiService.patch<any, { id: string; extraParameters: ExtraParameter[] }>(
    `casedata/${municipalityId}/errands/${errand.id}`,
    {
      id: errand.id.toString(),
      extraParameters: newExtraParameters,
    }
  );
};

// If parameter exists, replace the existing one, otherwise append to list
export const replaceExtraParameter = (extraParameters: ExtraParameter[], newParameter: ExtraParameter) => {
  return extraParameters.some((p) => p.key === newParameter.key)
    ? extraParameters.map((p) => (p.key === newParameter.key ? newParameter : p))
    : [...extraParameters, newParameter];
};
