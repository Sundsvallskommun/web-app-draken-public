import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

export const notification_UppgiftFieldTemplate: UppgiftField[] = [
  {
    field: 'external.currentHousing',
    value: '',
    label: 'Ange aktuell boendeform',
    formField: {
      type: 'select',
      options: [
        { label: 'Korttidsboende', value: 'SHORT_TERM_HOUSING' },
        { label: 'Äldreboende', value: 'ELDERLY_HOUSING' },
        { label: 'Gruppboende', value: 'GROUP_HOUSING' },
        { label: 'Serviceboende', value: 'SERVICE_HOUSING' },
        { label: 'Eget hus (villa, radhus)', value: 'OWN_HOUSING' },
        { label: 'Lägenhet', value: 'APARTMENT_HOUSING' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.currentHousingNameAndAddress',
    value: '',
    label: 'Ange namn och adress på aktuellt boende',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.currentHousing',
        value: ['SHORT_TERM_HOUSING', 'ELDERLY_HOUSING', 'GROUP_HOUSING', 'SERVICE_HOUSING'],
        validationMessage: 'Ange namn och adress för boendet.',
      },
    ],
  },
  {
    field: 'external.canReachNearestBusStop',
    value: '',
    label: 'Klarar den sökande att gå till och från busshållplatsen närmast bostaden?',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES' },
        { label: 'Nej', value: 'NO' },
        { label: 'Ibland', value: 'SOMETIMES' },
      ],
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.currentHousing',
        value: ['OWN_HOUSING', 'APARTMENT_HOUSING'],
        validationMessage: 'Besvara frågan om gång till busshållplats.',
      },
    ],
  },
  {
    field: 'external.canTravelIndependentlyByBus',
    value: '',
    label: 'Kan den sökande självständigt, utan hjälp av annan person resa med buss?',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES' },
        { label: 'Nej', value: 'NO' },
        { label: 'Ibland', value: 'SOMETIMES' },
      ],
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.currentHousing',
        value: ['OWN_HOUSING', 'APARTMENT_HOUSING'],
        validationMessage: 'Besvara frågan om självständig bussresa.',
      },
    ],
  },
  {
    field: 'external.canTravelWithAssistanceByBus',
    value: '',
    label: 'Kan den sökande med hjälp av annan person resa med buss?',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES' },
        { label: 'Nej', value: 'NO' },
        { label: 'Ibland', value: 'SOMETIMES' },
      ],
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.currentHousing',
        value: ['OWN_HOUSING', 'APARTMENT_HOUSING'],
        validationMessage: 'Besvara frågan om bussresa med hjälp.',
      },
    ],
  },
  {
    field: 'external.housingAccessibility',
    value: '',
    label: 'Ange tillgängligheten till bostaden',
    formField: {
      type: 'radio',
      options: [
        { label: 'Hiss finns', value: 'ELEVATOR_AVAILABLE' },
        { label: 'Ingen hiss, trappa till bostaden', value: 'NO_ELEVATOR' },
        { label: 'Markplan', value: 'GROUND_FLOOR' },
      ],
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.currentHousing',
        value: 'APARTMENT_HOUSING',
        validationMessage: 'Besvara frågan om tillgänglighet till bostaden.',
      },
    ],
  },
  {
    field: 'external.travelTypes',
    value: [],
    label: 'Välj resetyper anmälan gäller',
    formField: {
      type: 'checkbox',
      options: [
        { label: 'Privatresor/fritidsresor', value: 'PRIVATE', name: 'travelTypes' },
        { label: 'Arbetsresor', value: 'WORK', name: 'travelTypes' },
        { label: 'Utbildningsresor', value: 'EDUCATION', name: 'travelTypes' },
        { label: 'Gymnasieresor', value: 'GYMNASIUM', name: 'travelTypes' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.travelDestinationAddress',
    value: '',
    label: 'Ange adressen till arbetsplatsen/utbildningsplatsen/gymnasiet',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.travelTypes',
        value: ['WORK', 'EDUCATION', 'GYMNASIUM'],
        validationMessage: 'Ange adressen till arbetsplatsen/utbildningsplatsen/gymnasiet.',
      },
    ],
  },
  {
    field: 'personal.maxWalkingDistance',
    value: '',
    label: 'Hur långt klarar den sökande att gå på plan mark? Ange i antalet meter.',
    description: '',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    required: true,
  },
  {
    field: 'external.mobilityAid.boolean',
    value: '',
    label: 'Behöver den sökande förflyttningshjälpmedel?',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES', name: 'mobilityAids' },
        { label: 'Nej', value: 'NO', name: 'mobilityAids' },
      ],
    },
    required: true,
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.mobilityAids',
    value: [],
    label: 'Välj förflyttningshjälpmedel som den sökande är beroende av',
    formField: {
      type: 'combobox',
      options: [
        { label: 'Rollator', value: 'WALKER', name: 'mobilityAids' },
        { label: 'Krycka, käpp, stavar', value: 'CRUTCH_CANE_POLES', name: 'mobilityAids' },
        { label: 'Hopfällbar rullstol', value: 'FOLDABLE_WHEELCHAIR', name: 'mobilityAids' },
        { label: 'Komfortrullstol eller motsvarande', value: 'COMFORT_WHEELCHAIR', name: 'mobilityAids' },
        { label: 'Elrullstol', value: 'ELECTRIC_WHEELCHAIR', name: 'mobilityAids' },
        { label: 'Elscooter/elmoped', value: 'ELECTRIC_SCOOTER', name: 'mobilityAids' },
        { label: 'Ledarhund', value: 'GUIDE_DOG', name: 'mobilityAids' },
        { label: 'Vagn', value: 'TROLLEY', name: 'mobilityAids' },
        { label: 'Syrgas', value: 'OXYGEN', name: 'mobilityAids' },
        { label: 'Bälteskudde', value: 'BELT_PILLOW', name: 'mobilityAids' },
      ],
    },
    dependsOn: [
      {
        field: 'external.mobilityAid.boolean',
        value: 'YES',
        validationMessage: 'Vänligen bekräfta behovet av förflyttningshjälpmedel.',
      },
    ],
    section: 'Yttre omständigheter',
  },
    {
    field: 'external.assistanceDuringTravel',
    value: '',
    label: 'Behöver den sökande aktiv hjälp under själva resan? (T.ex. hjälp med betalning eller kommunicering)',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES' },
        { label: 'Nej', value: 'NO' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.inVehicleAssistanceDescription',
    value: '',
    label: 'Beskriv hjälpbehovet i fordonet',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.assistanceDuringTravel',
        value: 'YES',
        validationMessage: 'Beskriv hjälpbehovet under resan.',
      },
    ],
  },
  {
    field: 'medical.diagnoses',
    value: [],
    label: 'Ange medicinska diagnoser',
    formField: {
      type: 'combobox',
      options: [
        { label: 'Synskada', value: 'VISION_IMPAIRMENT', name: 'diagnoses' },
        { label: 'Fysisk, nedsatt rörelseförmåga', value: 'PHYSICAL_MOBILITY_IMPAIRMENT', name: 'diagnoses' },
        { label: 'Demenssjukdom', value: 'DEMENTIA', name: 'diagnoses' },
        {
          label: 'Kognitiv, neuropsykiatrisk eller intellektuell funktionsnedsättning',
          value: 'COGNITIVE_NEUROPSYCHIATRIC',
          name: 'diagnoses',
        },
        {
          label: 'Medicinsk, kronisk och långvarig sjukdom',
          value: 'CHRONIC_MEDICAL_CONDITION',
          name: 'diagnoses',
        },
        { label: 'Psykisk sjukdom', value: 'MENTAL_ILLNESS', name: 'diagnoses' },
        { label: 'Palliativ vård', value: 'PALLIATIVE_CARE', name: 'diagnoses' },
      ],
    },
    required: false,
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.onsetTime',
    value: '',
    label: 'När i tiden (ungefär) uppstod funktionsnedsättningen?',
    formField: {
      type: 'radio',
      options: [
        { label: 'Cirka 1 månad sedan eller mindre', value: 'LESS_THAN_ONE_MONTH' },
        { label: 'Inom de senaste 6 månaderna', value: 'LAST_SIX_MONTHS' },
        { label: 'Har pågått i 1 år eller mer', value: 'ONE_YEAR_OR_MORE' },
        { label: 'Medfödd', value: 'CONGENITAL' },
      ],
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.duration',
    value: '',
    label: 'Funktionsnedsättningens ungefärliga varaktighet',
    formField: {
      type: 'radio',
      options: [
        { label: 'Mindre än 3 månader', value: 'LESS_THAN_THREE_MONTHS' },
        { label: 'Minst 3 månader, men inte mer än 1 år', value: 'THREE_MONTHS_TO_ONE_YEAR' },
        { label: '1 år eller mer', value: 'MORE_THAN_ONE_YEAR' },
      ],
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.consequencesDescription',
    value: '',
    label:
      'Beskriv vilken konsekvens sjukdomen/funktionsnedsättningen medför vid förflyttning och/eller resor med allmänna kommunikationer (buss)',
    formField: {
      type: 'textarea',
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.treatmentsDescription',
    value: '',
    label: 'Beskriv aktuella medicinska utredningar, behandling och rehabilitering',
    formField: {
      type: 'textarea',
    },
    section: 'Medicinskt utlåtande',
  },
];
