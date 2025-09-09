import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

export const notificationRenewal_UppgiftFieldTemplate: UppgiftField[] = [
  {
    field: 'external.changedConditionsDescription',
    value: '',
    label: 'Beskriv eventuellt förändrade förutsättningar',
    description: 'Ange boendeform och ev. namn på t.ex. äldreboendet',
    formField: { type: 'textarea' },
    section: 'Yttre omständigheter',
  },
  {
    field: 'personal.changedDisabilityOrReason',
    value: '',
    label: 'Beskriv förändringar i funktionsnedsättningen eller anledning till fortsatta tjänster',
    formField: { type: 'textarea' },
    section: 'Personlig information',
  },
  {
    field: 'personal.disabilityImpactDescription',
    value: '',
    label: 'Beskriv de besvär som funktionsnedsättningen/-arna orsakar',
    formField: { type: 'textarea' },
    section: 'Personlig information',
  },
  {
    field: 'personal.disabilityTimeOfOnset',
    value: '',
    label: 'När i tid (ungefär) uppstod funktionsnedsättningen',
    description: 'Exempel: medfödd nedsättning, uppstod för ca 1 år sedan',
    formField: { type: 'textarea' },
    section: 'Personlig information',
  },
  {
    field: 'personal.disabilityDuration',
    value: '',
    label: 'Funktionsnedsättning ungefärliga varaktighet',
    description: 'Exempel: medfödd nedsättning, bedömer att ca 5 månader',
    formField: { type: 'textarea' },
    section: 'Personlig information',
  },
  {
    field: 'personal.needForEscort',
    value: '',
    label: 'Ange om ansökan omfattar behov av ledsagare',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES', name: 'needForEscort' },
        { label: 'Nej', value: 'NO', name: 'needForEscort' },
      ],
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.escortHelpInCar',
    value: '',
    label: 'Beskriv varför ledsagare behövs under resan',
    formField: { type: 'textarea' },
    section: 'Personlig information',
    dependsOn: [
      { field: 'personal.needForEscort', value: 'YES', validationMessage: 'Vänligen beskriv behovet av ledsagare.' },
    ],
  },
  {
    field: 'medical.basisOfApplication',
    value: '',
    label: 'Uppgifter i ansökan baseras på',
    formField: {
      type: 'checkbox',
      options: [
        { label: 'Kontakt med anhöriga', value: 'FAMILY_CONTACT', name: 'basisOfApplication' },
        { label: 'Direkt kontakt med den sökande', value: 'APPLICANT_CONTACT', name: 'basisOfApplication' },
        { label: 'Journalanteckningar', value: 'MEDICAL_NOTES', name: 'basisOfApplication' },
        { label: 'Annan orsak', value: 'OTHER', name: 'basisOfApplication' },
      ],
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.basisOfApplicationOther',
    value: '',
    label: 'Annan orsak - beskrivning',
    formField: { type: 'textarea' },
    section: 'Medicinskt utlåtande',
    dependsOn: [
      {
        field: 'medical.basisOfApplication',
        value: 'OTHER',
        validationMessage: 'Vänligen beskriv vilka uppgifter ansökan baseras på.',
      },
    ],
  },
  {
    field: 'medical.knownSince',
    value: '',
    label: 'Kännedom om den sökande sedan',
    formField: { type: 'date' },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.mainDiagnosis',
    value: '',
    label: 'Huvuddiagnos',
    formField: { type: 'textarea' },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.otherDiagnoses',
    value: '',
    label: 'Övriga diagnoser',
    formField: { type: 'textarea' },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.investigationsTreatments',
    value: '',
    label: 'Aktuella utredningar, behandlingar och eller rehabilitering',
    formField: { type: 'textarea' },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.otherInfo',
    value: '',
    label: 'Annan information',
    formField: { type: 'textarea' },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.certifiedByLicensedPersonnel',
    value: '',
    description: 'Med legitimerad personal avses personal med minst sjuksköterskeutbildning och giltig legitimation.',
    label: 'Jag intygar som legitimerad personal, att uppgifterna är riktiga',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Ja, jag är legitimerad och intygar att uppgifterna är riktiga',
          value: 'LICENSED',
          name: 'certification',
        },
        {
          label: 'Nej, jag är inte legitimerad',
          value: 'NOT_LICENSED',
          name: 'certification',
        },
      ],
    },
    section: 'Medicinskt utlåtande',
  },
];
