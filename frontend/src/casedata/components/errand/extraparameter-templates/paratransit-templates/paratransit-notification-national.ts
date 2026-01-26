import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { swedishMunicipalities } from '../municipalities';

export const journeyFieldsGroup = {
  groupName: 'Resa',
  basePath: 'personal.journey',
  section: 'Yttre omständigheter',
  repeatableConfig: {
    minItems: 1,
    addButtonText: 'Lägg till resa',
    removeButtonText: 'Ta bort resa',
  },
  fields: [
    {
      field: 'travelFromMunicipality',
      value: '',
      label: 'Från kommun',
      formField: {
        type: 'select',
        options: swedishMunicipalities,
      },
      section: 'Yttre omständigheter',
      required: true,
      pairWith: 'travelToMunicipality',
    },
    {
      field: 'travelToMunicipality',
      value: '',
      label: 'Till kommun',
      formField: {
        type: 'select',
        options: swedishMunicipalities,
      },
      section: 'Yttre omständigheter',
      required: true,
    },
    {
      field: 'travelFromLocation',
      value: '',
      label: 'Från - Ort (kompletterande)',
      formField: {
        type: 'textarea',
      },
      section: 'Yttre omständigheter',
      pairWith: 'travelToLocation',
    },
    {
      field: 'travelToLocation',
      value: '',
      label: 'Till - Ort (kompletterande)',
      formField: {
        type: 'textarea',
      },
      section: 'Yttre omständigheter',
    },
    {
      field: 'travelDateKnown',
      value: '',
      label: 'Vet du vilket datum resan ska inträffa?',
      formField: {
        type: 'radio',
        options: [
          { label: 'Jag vet datum', value: 'YES', name: 'travelDateKnown' },
          { label: 'Jag vet inte exakt datum', value: 'NO', name: 'travelDateKnown' },
        ],
      },
      section: 'Yttre omständigheter',
    },
    {
      field: 'travelDate',
      value: '',
      label: 'Ange datum',
      formField: {
        type: 'date',
      },
      section: 'Yttre omständigheter',
      dependsOn: [{ field: 'travelDateKnown', value: 'YES', validationMessage: 'Vänligen ange resedatum.' }],
    },
    {
      field: 'travelMonth',
      value: '',
      label: 'Ange månad för resan',
      description: 'Om du inte vet exakt datum och tid för din resa, välj en månad då resan förväntas inträffa',
      formField: {
        type: 'select',
        options: [
          { label: 'Januari', value: 'JANUARY' },
          { label: 'Februari', value: 'FEBRUARY' },
          { label: 'Mars', value: 'MARCH' },
          { label: 'April', value: 'APRIL' },
          { label: 'Maj', value: 'MAY' },
          { label: 'Juni', value: 'JUNE' },
          { label: 'Juli', value: 'JULY' },
          { label: 'Augusti', value: 'AUGUST' },
          { label: 'September', value: 'SEPTEMBER' },
          { label: 'Oktober', value: 'OCTOBER' },
          { label: 'November', value: 'NOVEMBER' },
          { label: 'December', value: 'DECEMBER' },
        ],
      },
      section: 'Yttre omständigheter',
      dependsOn: [{ field: 'travelDateKnown', value: 'NO', validationMessage: 'Vänligen ange månad för resan.' }],
    },
  ] as UppgiftField[],
};

export const notificationNational_UppgiftFieldTemplate: UppgiftField[] = [
  {
    field: 'personal.purposeOfTravel',
    value: '',
    label: 'Beskriv ändamålet med resan',
    description:
      'Riksfärdtjänst kan inte beviljas till sjukvårdande behandling eller tjänsteresor. Vid sjukvårdande behandling ska man vända sig till regionen för sjukresor',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    required: true,
  },
  {
    field: 'personal.journey',
    value: '',
    label: 'Resor',
    formField: {
      type: 'repeatableGroup' as any,
    },
    section: 'Yttre omständigheter',
    repeatableGroup: journeyFieldsGroup,
  } as any,
  {
    field: 'personal.maxWalkingDistance',
    value: '',
    label: 'Hur långt klarar den sökande att gå på plan mark i meter?',
    description: '',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    required: true,
  },
  {
    field: 'personal.mobilityAidNeeded',
    value: '',
    label: 'Behöver den sökande förflyttningshjälpmedel?',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES', name: 'mobilityAidNeeded' },
        { label: 'Nej', value: 'NO', name: 'mobilityAidNeeded' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'personal.mobilityAids',
    value: [],
    label: 'Ange ett eller flera förflyttningshjälpmedel som den sökande är beroende av för att kunna genomföra resan',
    formField: {
      type: 'combobox',
      options: [
        { label: 'Rollator', value: 'WALKER', name: 'mobilityAids' },
        { label: 'Krycka, käpp, stavar', value: 'CRUTCH_CANE_POLES', name: 'mobilityAids' },
        { label: 'Hopfällbar rullstol', value: 'FOLDABLE_WHEELCHAIR', name: 'mobilityAids' },
        { label: 'Komfortrullstol eller motsvarande', value: 'COMFORT_WHEELCHAIR', name: 'mobilityAids' },
        { label: 'Elrullstol', value: 'ELECTRIC_WHEELCHAIR', name: 'mobilityAids' },
        { label: 'Ledarhund', value: 'GUIDE_DOG', name: 'mobilityAids' },
        { label: 'Vagn', value: 'TROLLEY', name: 'mobilityAids' },
        { label: 'Syrgas', value: 'OXYGEN', name: 'mobilityAids' },
        { label: 'Bälteskudde', value: 'BELT_PILLOW', name: 'mobilityAids' },
      ],
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'personal.mobilityAidNeeded',
        value: 'YES',
        validationMessage: 'Vänligen välj förflyttningshjälpmedel.',
      },
    ],
  },
  {
    field: 'personal.walkingDistance',
    value: '',
    label: 'Hur långt klarar den sökande att gå på plan mark? Ange i antalet meter',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOnLogic: 'OR',
    dependsOn: [
      {
        field: 'personal.mobilityAids',
        value: ['WALKER', 'CRUTCH_CANE_POLES'],
        validationMessage: 'Vänligen ange hur långt du kan gå på plan mark i meter (minst 4 tecken).',
      },
      {
        field: 'personal.mobilityAidNeeded',
        value: 'NO',
        validationMessage: 'Vänligen ange hur långt du kan gå på plan mark i meter (minst 4 tecken).',
      },
    ],
  },
  {
    field: 'personal.needForEscort',
    value: '',
    label: 'Behöver den sökande aktiv hjälp av en ledsagare under själva resan?',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES', name: 'needForEscort' },
        { label: 'Nej', value: 'NO', name: 'needForEscort' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'personal.escortHelpDescription',
    value: '',
    label: 'Beskriv behovet av hjälp',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'personal.needForEscort',
        value: 'YES',
        validationMessage: 'Vänligen beskriv behovet av ledsagare under resan.',
      },
    ],
  },
  {
    field: 'personal.transportTypes',
    value: [],
    label: 'Ange ett eller flera färdmedel för resan',
    formField: {
      type: 'combobox',
      options: [
        { label: 'Tåg', value: 'TRAIN', name: 'transportTypes' },
        { label: 'Buss', value: 'BUS', name: 'transportTypes' },
        { label: 'Flyg', value: 'PLANE', name: 'transportTypes' },
        { label: 'Båt', value: 'BOAT', name: 'transportTypes' },
        { label: 'Taxibil', value: 'TAXI', name: 'transportTypes' },
        { label: 'Rullstolstaxi', value: 'WHEELCHAIR_TAXI', name: 'transportTypes' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'personal.taxiDescription',
    value: '',
    label: 'Beskriv varför resan behöver ske med taxi',
    description: 'Riksfärdtjänst prioriterar allmänna transportmedel; taxiresor beviljas endast vid särskilda behov.',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'personal.transportTypes',
        value: ['TAXI', 'WHEELCHAIR_TAXI'],
        validationMessage: 'Vänligen beskriv varför resan behöver ske med taxi.',
      },
    ],
  },
  // Medical opinion section
  {
    field: 'medical.diagnoses',
    value: [],
    label: 'Ange funktionsnedsättning / funktionsnedsättningar',
    formField: {
      type: 'combobox',
      options: [
        { label: 'Synskada', value: 'VISUAL_IMPAIRMENT', name: 'diagnoses' },
        {
          label: 'Fysisk, nedsatt rörelseförmåga (orsakat av exempelvis stroke, artros)',
          value: 'PHYSICAL_MOBILITY_IMPAIRMENT',
          name: 'diagnoses',
        },
        { label: 'Demenssjukdom', value: 'DEMENTIA', name: 'diagnoses' },
        {
          label:
            'Kognitiv, neuropsykiatrisk eller intellektuell (som ger minnes, inlärning och/eller orienteringssvårigheter)',
          value: 'COGNITIVE_NEUROPSYCHIATRIC_INTELLECTUAL',
          name: 'diagnoses',
        },
        {
          label: 'Medicinsk, kronisk och långvarig sjukdom, (yrsel, KOL, hjärt/kärlsjukdom, muskelsjukdom)',
          value: 'CHRONIC_MEDICAL_CONDITION',
          name: 'diagnoses',
        },
        { label: 'Psykisk sjukdom', value: 'MENTAL_ILLNESS', name: 'diagnoses' },
        { label: 'Palliativ vård', value: 'PALLIATIVE_CARE', name: 'diagnoses' },
      ],
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.disabilityDuration',
    value: '',
    label: 'Ange funktionsnedsättningens ungefärliga varaktighet',
    formField: {
      type: 'radio',
      options: [
        { label: 'Mindre än 1 år', value: 'LESS_THAN_ONE_YEAR', name: 'disabilityDuration' },
        { label: '1 år eller mer', value: 'ONE_YEAR_OR_MORE', name: 'disabilityDuration' },
      ],
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.disabilityConsequences',
    value: '',
    label: 'Beskriv vilken konsekvens sjukdomstillståndet/funktionsnedsättningen medför',
    formField: {
      type: 'textarea',
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.publicTransportAbility',
    value: '',
    label: 'Beskriv den sökandes förmåga att resa med allmänna kommunikationer',
    formField: {
      type: 'textarea',
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.canUseEscortService',
    value: '',
    label:
      'Klarar den sökande att resa med allmänna kommunikationer med hjälp av ledsagarservice som trafikföretag tillhandahåller?',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES', name: 'canUseEscortService' },
        { label: 'Nej', value: 'NO', name: 'canUseEscortService' },
      ],
    },
    section: 'Medicinskt utlåtande',
  },
  {
    field: 'medical.escortServiceReason',
    value: '',
    label: 'Beskriv anledningen',
    formField: {
      type: 'textarea',
    },
    section: 'Medicinskt utlåtande',
    dependsOn: [
      {
        field: 'medical.canUseEscortService',
        value: 'NO',
        validationMessage: 'Vänligen beskriv anledningen.',
      },
    ],
  },
  {
    field: 'medical.additionalInfo',
    value: '',
    label: 'Beskriv annan viktig information om funktionsnedsättningen',
    formField: {
      type: 'textarea',
    },
    section: 'Medicinskt utlåtande',
    required: false,
  },
];
