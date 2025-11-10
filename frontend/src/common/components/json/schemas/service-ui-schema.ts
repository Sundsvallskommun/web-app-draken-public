import type { UiSchema } from '@rjsf/utils';

export const serviceUiSchema: UiSchema = {
  'ui:order': ['type', 'additionalAids', 'mobilityAids', 'validityType', 'validFrom', 'validTo', 'notes'],

  type: {
    'ui:widget': 'select',
    'ui:emptyValue': '',
    'ui:options': {
      layout: 'paired',
      className: 'w-full max-w-[48rem]',
    },
  },

  additionalAids: {
    'ui:widget': 'ComboboxWidget',
    'ui:options': {
      layout: 'paired',
      multiple: true,
      className: 'w-full max-w-[48rem]',
      placeholder: 'Välj tillägg',
    },
  },

  mobilityAids: {
    'ui:widget': 'ComboboxWidget',
    'ui:options': {
      multiple: true,
      className: 'w-full',
      placeholder: 'Välj förflyttningshjälpmedel',
    },
  },

  validityType: {
    'ui:widget': 'RadiobuttonWidget',
    'ui:options': {
      inline: true,
      className: 'w-full',
      hideDescription: true,
    },
  },

  validFrom: {
    'ui:title': 'Välj period insatsen gäller, startdatum',
    'ui:widget': 'date',
    'ui:options': {
      layout: 'paired',
      className: 'w-full max-w-[48rem]',
    },
  },

  validTo: {
    'ui:title': 'Välj period insatsen gäller, slutdatum',
    'ui:widget': 'date',
    'ui:options': {
      layout: 'paired',
      className: 'w-full max-w-[48rem]',
    },
  },

  notes: {
    'ui:widget': 'TexteditorWidget',
    'ui:options': {
      disableToolbar: false,
      hideLabel: true,
      hideDescription: true,
      className: 'w-full max-w-[96rem] min-h-[22rem]',
    },
  },
};
