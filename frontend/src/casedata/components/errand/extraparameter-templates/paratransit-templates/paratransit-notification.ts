import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

export const notification_UppgiftFieldTemplate: UppgiftField[] = [
  {
    field: 'external.currentHousing',
    value: '',
    label: 'Aktuellt boendeform',
    description: 'Ange boendeform och ev. namn på t.ex. äldreboendet',
    formField: {
      type: 'text',
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.requiredVehicleType',
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
    field: 'external.typeOfTravel',
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
    field: 'external.housingSituationDescription',
    value: '',
    label: 'Beskriv den sökandes boendesituation',
    formField: {
      type: 'textarea',
    },
    description: 'T.ex. finns det hiss, trappor eller trappor mellan lägenheten och ytterentré.',
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.canReachBusStop',
    value: '',
    label: 'Kan gå till och från busshållplats',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES' },
        { label: 'Nej', value: 'NO' },
        { label: 'Ibland', value: 'SOMETIMES' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.canTravelIndependently',
    value: '',
    label: 'Kan självständigt, utan hjälp av annan person resa med buss',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES' },
        { label: 'Nej', value: 'NO' },
        { label: 'Ibland', value: 'SOMETIMES' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.canTravelWithHelp',
    value: '',
    label: 'Kan med hjälp av annan person resa med buss',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES' },
        { label: 'Nej', value: 'NO' },
        { label: 'Ibland', value: 'SOMETIMES' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'personal.disabilityDescription',
    value: '',
    label: 'Beskriv funktionsnedsättningen',
    formField: { type: 'textarea' },
    section: 'Personlig information',
  },
  {
    field: 'personal.disabilityImpact',
    value: '',
    label: 'Beskriv de besvär som funktionsnedsättningen/-arna orsakar',
    formField: { type: 'textarea' },
    section: 'Personlig information',
  },
  {
    field: 'personal.travelAbilityAndAids',
    value: '',
    label: 'Ange reseförmåga och behov av hjälpmedel',
    description: 'T.ex. behöver hjälp att kommunicera, medicinsk hjälp',
    formField: {
      type: 'text',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.disabilitySince',
    value: '',
    label: 'När i tid (ungefär) uppstod funktionsnedsättningen',
    description: 'T.ex. uppstod för ca 1 år sedan',
    formField: {
      type: 'text',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.disabilityDuration',
    value: '',
    label: 'Funktionsnedsättning ungefärliga varaktighet',
    description: 'T.ex. bedömer att den vara i ytterligare 5 månader',
    formField: {
      type: 'text',
    },
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
    formField: { type: 'text' },
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
    field: 'medical.treatments',
    value: '',
    label: 'Aktuella utredningar, behandlingar och/eller rehabilitering',
    formField: { type: 'textarea' },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.additionalInfo',
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
      type: 'checkbox',
      options: [
        {
          label: 'Ja, jag är legitimerad',
          value: 'LICENSED',
          name: 'certification',
        },
      ],
    },
    section: 'Medicinskt utlåtande',
  },
];
