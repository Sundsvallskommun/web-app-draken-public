import { FTCaseType, MEXCaseType, PTCaseType } from '@casedata/interfaces/case-type';
import { IErrand } from '@casedata/interfaces/errand';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { apiService } from '@common/services/api-service';

export const EXTRAPARAMETER_SEPARATOR = '@';
export interface UppgiftField {
  field: string;
  value: string;
  label: string;
  formField:
    | { type: 'text'; options?: { placeholder?: string } }
    | { type: 'date'; options?: { min?: string; max?: string } }
    | { type: 'datetime-local' }
    | { type: 'textarea' }
    | { type: 'select'; options: { label: string; value: string }[] }
    | { type: 'radio'; options: { label: string; value: string }[]; inline?: boolean }
    | { type: 'radioPlus'; options: { label: string; value: string }[]; ownOption: string }
    | { type: 'checkbox'; options: { label: string; value: string; name: string }[] };
  section: string;
  dependsOn?: { field: string; value: string }[];
}

export interface ExtraParametersObject {
  ANMALAN_ATTEFALL?: UppgiftField[];
  MEX_LEASE_REQUEST?: UppgiftField[];
  MEX_BUY_LAND_FROM_THE_MUNICIPALITY?: UppgiftField[];
  MEX_SELL_LAND_TO_THE_MUNICIPALITY?: UppgiftField[];
  MEX_APPLICATION_SQUARE_PLACE?: UppgiftField[];
  MEX_BUY_SMALL_HOUSE_PLOT?: UppgiftField[];
  MEX_APPLICATION_FOR_ROAD_ALLOWANCE?: UppgiftField[];
  MEX_UNAUTHORIZED_RESIDENCE?: UppgiftField[];
  MEX_LAND_RIGHT?: UppgiftField[];
  MEX_PROTECTIVE_HUNTING?: UppgiftField[];
  MEX_LAND_INSTRUCTION?: UppgiftField[];
  MEX_OTHER?: UppgiftField[];
  MEX_LAND_SURVEYING_OFFICE?: UppgiftField[];
  MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOGUE_PLANNING_NOTICE?: UppgiftField[];
  MEX_INVOICE?: UppgiftField[];
  MEX_REQUEST_FOR_PUBLIC_DOCUMENT?: UppgiftField[];
  MEX_TERMINATION_OF_LEASE?: UppgiftField[];
  MEX_TERMINATION_OF_HUNTING_LEASE?: UppgiftField[];
  PARKING_PERMIT?: UppgiftField[];
  LOST_PARKING_PERMIT?: UppgiftField[];
  PARKING_PERMIT_RENEWAL?: UppgiftField[];
  APPEAL?: UppgiftField[];
}

const baseParkingPermitDetails: UppgiftField[] = [
  {
    field: 'application.applicant.capacity',
    value: '',
    label: 'Ansökan avser parkeringstillstånd som',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Förare',
          value: 'DRIVER',
        },
        { label: 'Passagerare', value: 'PASSENGER' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'application.reason',
    value: '',
    label: 'Ansöker om parkeringstillstånd av följande skäl',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'disability.aid',
    value: '',
    label: 'Gånghjälpmedel',
    formField: {
      type: 'checkbox',
      options: [
        {
          label: 'Krycka/kryckor/käpp',
          value: 'Krycka/kryckor/käpp',
          name: 'CRUTCH',
        },
        { label: 'Rullator', value: 'Rullator', name: 'ROLLER' },
        { label: 'Rullstol (manuell)', value: 'Rullstol (manuell)', name: 'WHEELCHAIR' },
        { label: 'Elrullstol', value: 'Elrullstol', name: 'EWHEELCHAIR' },
        { label: 'Inget', value: 'Inget', name: 'NONE' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'disability.walkingAbility',
    value: '',
    label: 'Är den sökande helt rullstolsburen eller kan hen gå kortare sträckor?',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Den sökande är helt rullstolsburen',
          value: 'false',
        },
        { label: 'Den sökande kan gå själv kortare sträckor', value: 'true' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'disability.walkingDistance.beforeRest',
    value: '',
    label: 'Möjlig gångsträcka innan behov att stanna och vila, med eventuellt gånghjälpmedel',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'disability.walkingDistance.max',
    value: '',
    label: 'Maximal gångsträcka, med eventuellt gånghjälpmedel. Inklusive uppehåll för vila',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'disability.duration',
    value: '',
    label: 'Funktionsnedsättningens varaktighet',
    formField: {
      type: 'select',
      options: [
        { value: 'P6M', label: 'Mindre än 6 månader' },
        { value: 'P1Y', label: '6 månader till 1 år' },
        { value: 'P2Y', label: '1-2 år' },
        { value: 'P3Y', label: '2-3 år' },
        { value: 'P4Y', label: '3-4 år' },
        { value: 'P5Y', label: 'Mer än 4 år' },
        { value: 'P0Y', label: 'Bestående' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'disability.canBeAloneWhileParking',
    dependsOn: [{ field: 'application.applicant.capacity', value: 'PASSENGER' }],
    value: '',
    label: 'Kan den sökande lämnas ensam en kort stund medan föraren parkerar fordonet?',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Ja',
          value: 'true',
        },
        { label: 'Nej', value: 'false' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'disability.canBeAloneWhileParking.note',
    dependsOn: [
      { field: 'disability.canBeAloneWhileParking', value: 'false' },
      { field: 'application.applicant.capacity', value: 'PASSENGER' },
    ],
    value: '',
    label: 'Beskriv behovet av...',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'consent.contact.doctor',
    value: '',
    label: 'Får utredare kontakta intygsskrivande läkare?',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Ja',
          value: 'true',
        },
        { label: 'Nej', value: 'false' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'consent.view.transportationServiceDetails',
    value: '',
    label: 'Får utredare ta del av information runt färdtjänst?',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Ja',
          value: 'true',
        },
        { label: 'Nej', value: 'false' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'application.applicant.signingAbility',
    value: '',
    label: 'Kan den sökande signera med sin namnteckning?',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Ja',
          value: 'true',
        },
        { label: 'Nej', value: 'false' },
      ],
    },
    section: 'Övergripande',
  },
];

const baseDetails: UppgiftField[] = [
  {
    field: 'caseMeaning',
    value: '',
    label: 'Ärendemening',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
];

const template: ExtraParametersObject = {
  MEX_OTHER: [
    ...baseDetails,
    {
      field: 'otherInformation',
      value: '',
      label: 'Ärendeinformation',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_LAND_SURVEYING_OFFICE: [
    ...baseDetails,
    {
      field: 'otherInformation',
      value: '',
      label: 'Ärendeinformation',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'yNumber',
      value: '',
      label: 'Y-nummer',

      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
  ],

  MEX_LAND_RIGHT: [
    ...baseDetails,
    {
      field: 'otherInformation',
      value: '',
      label: 'Ärendeinformation',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_PROTECTIVE_HUNTING: [
    ...baseDetails,
    {
      field: 'sightingLocation',
      value: '',
      label: 'Var sågs det skadade djuret',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'sightingTime',
      value: '',
      label: 'När sågs det skadade djuret',
      formField: {
        type: 'datetime-local',
      },
      section: 'Övergripande',
    },
    {
      field: 'urgent',
      value: '',
      label: 'Är det brådskande',
      formField: {
        type: 'radio',
        options: [
          { label: 'Ja', value: 'Ja' },
          { label: 'Nej', value: 'Nej' },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'otherInformation',
      value: '',
      label: 'Övrigt',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_LAND_INSTRUCTION: [
    ...baseDetails,
    {
      field: 'otherInformation',
      value: '',
      label: 'Ärendeinformation',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_REQUEST_FOR_PUBLIC_DOCUMENT: [
    ...baseDetails,
    {
      field: 'otherInformation',
      value: '',
      label: 'Ärendeinformation',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOGUE_PLANNING_NOTICE: [
    ...baseDetails,
    {
      field: 'otherInformation',
      value: '',
      label: 'Ärendeinformation',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_INVOICE: [
    ...baseDetails,
    {
      field: 'invoiceNumber',
      value: '',
      label: 'Fakturanummer',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'invoiceRecipient',
      value: '',
      label: 'Vem är fakturan utställd på',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'otherInformation',
      value: '',
      label: 'Ärendeinformation',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_LEASE_REQUEST: [
    ...baseDetails,
    {
      field: 'reason',
      value: '',
      label: 'Vad vill du använda marken till',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'fromDate',
      value: '',
      label: 'När vill du börja använda marken',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },
    {
      field: 'toDate',
      value: '',
      label: 'När vill du sluta använda marken',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },
    {
      field: 'otherInformation',
      value: '',
      label: 'Övrigt',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_TERMINATION_OF_LEASE: [
    ...baseDetails,
    {
      field: 'reason',
      value: '',
      label: 'Ange anledning till att du önskar säga upp avtalet',
      formField: {
        type: 'radio',
        options: [
          {
            label: 'Jag behöver inte använda marken längre',
            value: 'Jag behöver inte använda marken längre',
          },
          { label: 'Jag har flyttat', value: 'Jag har flyttat' },
          { label: 'Arrendatorn har avlidit', value: 'Arrendatorn har avlidit' },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'reason.other',
      value: '',
      label: 'Annan anledning',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'fromDate',
      value: '',
      label: 'Från vilket datum önskar du säga upp avtalet',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },
    {
      field: 'otherInformation',
      value: '',
      label: 'Övrigt',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_BUY_LAND_FROM_THE_MUNICIPALITY: [
    ...baseDetails,
    {
      field: 'errandInformation',
      value: '',
      label: 'Vad vill du använda marken till',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'typeOfEstablishment',
      value: '',
      label: 'Vilken typ av verksamhet gäller förfrågan',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'jobOpportunities',
      value: '',
      label: 'Kommer din etablering att generera arbetstillfällen. I så fall hur många',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'constructionOfBuildings',
      value: '',
      label: 'Vill ni uppföra byggnader',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'landArea',
      value: '',
      label: 'Hur stor markyta behövs',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'electricity',
      value: '',
      label: 'Är verksamheten elintensiv',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'timetable',
      value: '',
      label: 'När behöver ni marken',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },
    {
      field: 'otherInformation',
      value: '',
      label: 'Övrigt',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_SELL_LAND_TO_THE_MUNICIPALITY: [
    ...baseDetails,
    {
      field: 'reason',
      value: '',
      label: 'Beskriv anledningen eller hur det kommer sig att du vill sälja marken',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'otherInformation',
      value: '',
      label: 'Övrigt',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_APPLICATION_SQUARE_PLACE: [
    ...baseDetails,
    {
      field: 'taxBill_request',
      value: '',
      label: 'Vad gäller för dig',
      formField: {
        type: 'select',
        options: [
          { label: 'Jag har F-skattsedel och bifogar den', value: 'Jag har F-skattsedel och bifogar den' },
          {
            label: 'Jag står återkommande på torget och har tidigare skickat in F-skattsedel',
            value: 'Jag står återkommande på torget och har tidigare skickat in F-skattsedel',
          },
          { label: 'Jag har ingen F-skattsedel', value: 'Jag har ingen F-skattsedel' },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'location_1',
      value: '',
      label: 'Önskad plats som förstahandsval',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'location_2',
      value: '',
      label: 'Önskad plats som andrahandsval',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'location_3',
      value: '',
      label: 'Önskad plats som tredjehandsval',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },

    {
      field: 'occasion1.fromDate',
      value: '',
      label: 'Första tillfället från',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },

    {
      field: 'occasion1.toDate',
      value: '',
      label: 'Första tillfället till',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },

    {
      field: 'occasion2.fromDate',
      value: '',
      label: 'Andra tillfället från',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },

    {
      field: 'occasion2.toDate',
      value: '',
      label: 'Andra tillfället till',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },

    {
      field: 'occasion3.fromDate',
      value: '',
      label: 'Tredje tillfället från',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },

    {
      field: 'occasion3.toDate',
      value: '',
      label: 'Tredje tillfället till',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },

    {
      field: 'occasion4.fromDate',
      value: '',
      label: 'Fjärde tillfället från',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },

    {
      field: 'occasion4.toDate',
      value: '',
      label: 'Fjärde tillfället till',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },

    {
      field: 'occasion5.fromDate',
      value: '',
      label: 'Femte tillfället från',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },

    {
      field: 'occasion5.toDate',
      value: '',
      label: 'Femte tillfället till',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },

    {
      field: 'electricity',
      value: '',
      label: 'Önskas el',
      formField: {
        type: 'radio',
        options: [
          { label: 'Ja', value: 'Ja' },
          { label: 'Nej', value: 'Nej' },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'water_sewage',
      value: '',
      label: 'Önskas tillgång till wc, vatten och/eller sopor',
      formField: {
        type: 'radio',
        options: [
          { label: 'Ja', value: 'Ja' },
          { label: 'Nej', value: 'Nej' },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'otherInformation',
      value: '',
      label: 'Övrigt',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_TERMINATION_OF_HUNTING_LEASE: [
    ...baseDetails,
    {
      field: 'reason',
      value: '',
      label: 'Varför vill du säga upp ditt avtal',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'fromDate',
      value: '',
      label: 'Från vilket datum önskar du säga upp avtalet',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },
    {
      field: 'otherInformation',
      value: '',
      label: 'Övrigt',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_BUY_SMALL_HOUSE_PLOT: [
    ...baseDetails,
    {
      field: 'otherInformation',
      value: '',
      label: 'Övrigt',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  MEX_APPLICATION_FOR_ROAD_ALLOWANCE: [
    ...baseDetails,
    {
      field: 'applicantType',
      value: '',
      label: 'Ansöker som',
      formField: {
        type: 'radio',
        options: [
          { label: 'Privatperson', value: 'Privatperson' },
          { label: 'Representant för förening', value: 'Representant för förening' },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'roadType',
      value: '',
      label: 'Ansökan gäller',
      formField: {
        type: 'radio',
        options: [
          { label: 'Enskild väg med stadsbidrag', value: 'Enskild väg med statsbidrag' },
          { label: 'Enskild väg UTAN stadsbidrag', value: 'Enskild väg UTAN statsbidrag' },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'registrationAddressStatus',
      value: '',
      label: 'Sökandes folkbokföring',
      formField: {
        type: 'radio',
        options: [
          {
            label: 'Ja jag är folkbokförd',
            value: 'Ja jag är folkbokförd',
          },
          {
            label: 'Nej jag är inte folkbokförd',
            value: 'Nej jag är inte folkbokförd',
          },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'otherInformation',
      value: '',
      label: 'Information om vägen',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
    {
      field: 'account.type',
      value: '',
      label: 'Typ av konto',
      formField: {
        type: 'radio',
        options: [
          { label: 'Bankgiro', value: 'Bankgiro' },
          { label: 'Plusgiro', value: 'Plusgiro' },
          { label: 'Bankkonto (endast privatperson)', value: 'Bankkonto' },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'account.number',
      value: '',
      label: 'Giro-nummer',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'account.owner',
      value: '',
      label: 'Giro-ägare',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'account.bank',
      value: '',
      label: 'Bank',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'account.owner',
      value: '',
      label: 'Kontoägare',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'account.ownerIdentifier',
      value: '',
      label: 'Kontoägarens personnummer',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'account.number',
      value: '',
      label: 'Kontonummer',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
  ],

  MEX_UNAUTHORIZED_RESIDENCE: [
    ...baseDetails,
    {
      field: 'otherInformation',
      value: '',
      label: 'Ärendeinformation',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],

  PARKING_PERMIT: [...baseDetails, ...baseParkingPermitDetails],
  LOST_PARKING_PERMIT: [
    ...baseDetails,
    ...baseParkingPermitDetails,
    {
      field: 'application.lostPermit.policeReportNumber',
      value: '',
      label: 'Diarie/ärendenummer för polisanmälan',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
  ],
  PARKING_PERMIT_RENEWAL: [
    ...baseDetails,
    ...baseParkingPermitDetails,
    {
      field: 'application.renewal.changedCircumstances',
      value: '',
      label: 'Råder förändrade omständigheter?',
      formField: {
        type: 'radio',
        options: [
          {
            label: 'Ja',
            value: 'Y',
          },
          { label: 'Nej', value: 'N' },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'application.renewal.expirationDate',
      value: '',
      label: 'Utgångsdatum för nuvarande tillstånd',
      formField: {
        type: 'text',
      },
      section: 'Övergripande',
    },
    {
      field: 'application.renewal.medicalConfirmationRequired',
      value: '',
      label: 'Krävs läkarintyg?',
      formField: {
        type: 'radio',
        options: [
          {
            label: 'Ja',
            value: 'yes',
          },
          { label: 'Nej', value: 'no' },
        ],
      },
      section: 'Övergripande',
    },
  ],
  APPEAL: [
    ...baseDetails,
    {
      field: 'application.appeal.type',
      value: '',
      label: 'Typ av överklagan',
      formField: {
        type: 'radio',
        options: [
          {
            label: 'Överklagar beslut',
            value: 'appeal_decision',
          },
          { label: 'Överklagar rättidsprövning', value: 'appeal_time' },
          { label: 'Kommunen överklagar', value: 'appeal_municipality' },
        ],
      },
      section: 'Övergripande',
    },
    {
      field: 'application.appeal.date',
      value: '',
      label: 'Ange datum överklagan inkom till kommunen',
      formField: {
        type: 'date',
      },
      section: 'Övergripande',
    },
    {
      field: 'application.appeal.recivedintime',
      value: '',
      label: 'Rättidsprövning',
      formField: {
        type: 'radio',
        options: [
          {
            label: 'Överklagan inkom i rätt tid',
            value: 'true',
          },
          { label: 'Överklagan inkom inte i rätt tid', value: 'false' },
        ],
        inline: true,
      },
      section: 'Övergripande',
    },
    {
      field: 'application.appeal.extra',
      value: '',
      label: 'Övrig information',
      formField: {
        type: 'textarea',
      },
      section: 'Övergripande',
    },
  ],
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
    const caseType = errand.caseType;
    const field = param['key'];

    const value = param?.values[0] || '';

    if (caseType in MEXCaseType || caseType in PTCaseType || caseType in FTCaseType) {
      const caseTypeTemplate = template[caseType] as UppgiftField[];
      const templateField = caseTypeTemplate?.find((f) => f.field === field);

      if (caseType && field && templateField) {
        const { label, formField, section, dependsOn } = templateField;
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
        const i = a.findIndex((f) => {
          return f.field === field;
        });
        if (i > -1) {
          obj[caseType][i] = data;
        } else {
          obj[caseType].push(data);
        }
      }
    }
  });
  return obj;
};

export const saveExtraParameters = (municipalityId: string, data: ExtraParameter[], errand: IErrand) => {
  const nullFilteredData: ExtraParameter[] = data.filter(
    (d) => d.values[0] !== null && typeof d.values[0] !== 'undefined'
  );
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
