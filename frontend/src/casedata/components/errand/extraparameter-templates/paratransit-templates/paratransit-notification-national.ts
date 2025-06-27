import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

export const notificationNational_UppgiftFieldTemplate: UppgiftField[] = [
  {
    field: 'external.currentHousingDescription',
    value: '',
    label: 'Aktuellt boendeform',
    description: 'Ange boendeform och ev. namn på t.ex. äldreboendet',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.vehicleTypeNeeded',
    value: '',
    label: 'Vilken typ av fordonstyp bedöms behövas',
    formField: {
      type: 'radio',
      options: [
        { label: 'Taxibil', value: 'TAXI' },
        { label: 'Litet specialfordon', value: 'SMALL_SPECIAL' },
        { label: 'Stort specialfordon', value: 'LARGE_SPECIAL' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.livingSituationDescription',
    value: '',
    label: 'Beskriv den sökandes boendesituation',
    description: 'Finns det hiss, trappor eller trapport mellan lägenhet och ytterentré',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.travelType',
    value: '',
    label: 'Vilken typ av resor gäller ärendet',
    formField: {
      type: 'select',
      options: [
        { label: 'Utbildningsresor', value: 'EDUCATION' },
        { label: 'Arbetsresor', value: 'WORK' },
        { label: 'Personliga resor', value: 'PERSONAL' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.travelDestinations',
    value: '',
    label: 'Vilket/vilka resmål gäller ärendet',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'personal.disabilityDescription',
    value: '',
    label: 'Beskriv funktionsnedsättningen',
    formField: {
      type: 'textarea',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.disabilityImpactDescription',
    value: '',
    label: 'Beskriv de besvär som funktionsnedsättningen/-arna orsakar',
    formField: {
      type: 'textarea',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.travelAbilityAndAids',
    value: '',
    label: 'Ange reseförmåga och behov av hjälpmedel',
    description: 'Behöver hjälp att kommunicera, medicinsk hjälp',
    formField: {
      type: 'textarea',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.purposeOfTravel',
    value: '',
    label: 'Ange ändamål med resan',
    formField: {
      type: 'textarea',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.travelPeriodFrom',
    value: '',
    label: 'Ange perioden för resan/resorna – från',
    formField: {
      type: 'date',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.travelPeriodTo',
    value: '',
    label: 'Ange perioden för resan/resorna – till',
    formField: {
      type: 'date',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.needForEscort',
    value: '',
    label: 'Ange om ansökan omfattar behov av ledsagare?',
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
    formField: {
      type: 'textarea',
    },
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
    field: 'medical.mainDiagnosis',
    value: '',
    label: 'Huvuddiagnos',
    formField: {
      type: 'textarea',
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.otherDiagnoses',
    value: '',
    label: 'Övriga diagnoser',
    formField: {
      type: 'textarea',
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.investigationsTreatments',
    value: '',
    label: 'Aktuella utredningar, behandlingar och eller rehabilitering',
    formField: {
      type: 'textarea',
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.otherInfo',
    value: '',
    label: 'Annan information',
    formField: {
      type: 'textarea',
    },
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
