import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

export const changeQuestions: UppgiftField[] = [
  {
    field: 'external.changeEscortNeeded',
    value: '',
    label: 'Gäller det behov av ledsagare under resan?',
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
    field: 'external.changeEscortDescription',
    value: '',
    label: 'Beskriv behovet av ledsagare',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.changeEscortNeeded',
        value: 'YES',
        validationMessage: 'Beskriv behovet av ledsagare.',
      },
    ],
  },
  {
    field: 'external.changeVehicleType',
    value: '',
    label: 'Gäller det ändring av fordonstyp?',
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
    field: 'external.changeVehicleTypes',
    value: [],
    label: 'Välj fordonstyp',
    formField: {
      type: 'combobox',
      options: [
        { label: 'Personbil', value: 'CAR', name: 'changeVehicleTypes' },
        { label: 'Rullstolstaxi', value: 'WHEELCHAIR_TAXI', name: 'changeVehicleTypes' },
        { label: 'Specialfordon', value: 'SPECIAL_VEHICLE', name: 'changeVehicleTypes' },
      ],
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.changeVehicleType',
        value: 'YES',
        validationMessage: 'Välj fordonstyp.',
      },
    ],
  },
  {
    field: 'external.changeFrontSeat',
    value: '',
    label: 'Gäller det framsätesplacering?',
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
    field: 'external.changeFrontSeatDescription',
    value: '',
    label: 'Beskriv behovet av framsätesplacering',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.changeFrontSeat',
        value: 'YES',
        validationMessage: 'Beskriv behovet av framsätesplacering.',
      },
    ],
  },
  {
    field: 'external.changePickupDropoff',
    value: '',
    label: 'Gäller det hämtning/lämning i bostaden av chauffören?',
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
    field: 'external.changePickupDropoffDescription',
    value: '',
    label: 'Beskriv behovet av hämtning/lämning',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.changePickupDropoff',
        value: 'YES',
        validationMessage: 'Beskriv behovet av hämtning/lämning.',
      },
    ],
  },
  {
    field: 'external.changeYearRound',
    value: '',
    label: 'Gäller det att ändra till färdtjänst året runt?',
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
    field: 'external.changeYearRoundDescription',
    value: '',
    label: 'Beskriv förändringen',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.changeYearRound',
        value: 'YES',
        validationMessage: 'Beskriv förändringen.',
      },
    ],
  },
  {
    field: 'external.changeWinterParatransit',
    value: '',
    label: 'Gäller det förändrat behov av vinterfärdtjänst (1/10–30/4)?',
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
    field: 'external.changeWinterParatransitDescription',
    value: '',
    label: 'Beskriv förändringen av vinterfärdtjänst',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.changeWinterParatransit',
        value: 'YES',
        validationMessage: 'Beskriv förändringen av vinterfärdtjänst.',
      },
    ],
  },
  {
    field: 'external.changeTripCount',
    value: '',
    label: 'Gäller det förändring i antal resor?',
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
    field: 'external.changeTripCountDescription',
    value: '',
    label: 'Beskriv förändringen i antal resor',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.changeTripCount',
        value: 'YES',
        validationMessage: 'Beskriv förändringen i antal resor.',
      },
    ],
  },
  {
    field: 'external.changeOther',
    value: '',
    label: 'Gäller det något annat?',
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
    field: 'external.changeOtherDescription',
    value: '',
    label: 'Beskriv vad förändringen gäller',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.changeOther',
        value: 'YES',
        validationMessage: 'Beskriv vad förändringen gäller.',
      },
    ],
  },
];
