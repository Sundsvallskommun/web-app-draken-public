import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

export const baseParkingPermitDetails: UppgiftField[] = [
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
