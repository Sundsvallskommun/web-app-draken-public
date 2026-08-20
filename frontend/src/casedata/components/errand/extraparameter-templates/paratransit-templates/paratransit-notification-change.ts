import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

import { changeQuestions } from './paratransit-change-questions';
import { notification_UppgiftFieldTemplate } from './paratransit-notification';

const medicalFields = notification_UppgiftFieldTemplate.filter((field) => field.section === 'Medicinskt utlåtande');

const helpTextField: UppgiftField = {
  field: 'external.changeHelpText',
  value: '',
  label: '',
  description:
    'Den här ärendetypen gäller för personer som har ett giltigt färdtjänstbeslut men behöver göra en förändring. Du kan till exempel svara "Ja" på frågorna nedan. Fyll då i relevant information kopplad till respektive insats.',
  formField: {
    type: 'info',
  },
  section: 'Yttre omständigheter',
};

export const notificationChange_UppgiftFieldTemplate: UppgiftField[] = [
  helpTextField,
  ...changeQuestions,
  ...medicalFields,
];
