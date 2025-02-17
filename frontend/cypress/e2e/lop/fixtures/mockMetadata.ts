import { MetadataResponse } from '@common/data-contracts/supportmanagement/data-contracts';

export const mockCategories = [
  {
    name: 'ADMINISTRATION',
    displayName: 'Administration',
    types: [
      {
        name: 'ADMINISTRATION.PERMISSION',
        displayName: 'Behörighet',
        created: '2024-09-16T12:40:47.365+02:00',
      },
    ],
    created: '2024-09-16T12:40:47.363+02:00',
  },
  {
    name: 'ELECTRICITY_SERVANET',
    displayName: 'Elnät/Servanet',
    types: [
      {
        name: 'ELECTRICITY_SERVANET.EMPLOYMENT',
        displayName: 'Anställning',
        created: '2024-09-16T08:52:51.214+02:00',
      },
      {
        name: 'ELECTRICITY_SERVANET.EXTRA_DISBURSEMENT',
        displayName: 'Extra utbetalning',
        created: '2024-09-16T08:52:51.216+02:00',
      },
      {
        name: 'ELECTRICITY_SERVANET.ABSENCE',
        displayName: 'Frånvaro',
        created: '2024-09-16T08:52:51.217+02:00',
      },
      {
        name: 'ELECTRICITY_SERVANET.AUTHORITY_LETTER',
        displayName: 'Myndighetspost',
        created: '2024-09-16T08:52:51.217+02:00',
      },
      {
        name: 'ELECTRICITY_SERVANET.POLITICIAN',
        displayName: 'Politiker',
        created: '2024-09-16T08:52:51.218+02:00',
      },
      {
        name: 'ELECTRICITY_SERVANET.SCHEDULE',
        displayName: 'Schema',
        created: '2024-09-16T08:52:51.218+02:00',
      },
      {
        name: 'ELECTRICITY_SERVANET.HOURLY_SUBSTITUTE',
        displayName: 'Timvikarie',
        created: '2024-09-16T08:52:51.219+02:00',
      },
      {
        name: 'ELECTRICITY_SERVANET.CONTACT_WANTED',
        displayName: 'Önskar kontakt',
        created: '2024-09-16T08:52:51.219+02:00',
      },
      {
        name: 'ELECTRICITY_SERVANET.OTHER',
        displayName: 'Övrigt',
        created: '2024-09-16T08:52:51.22+02:00',
      },
    ],
    created: '2023-09-27T08:04:27+02:00',
  },
  {
    name: 'LAS',
    displayName: 'Las',
    types: [
      {
        name: 'LAS.PRECEDENCE',
        displayName: 'Företräde',
        created: '2024-09-16T08:53:17.931+02:00',
      },
      {
        name: 'LAS.SSIA',
        displayName: 'Försäkringskassan',
        created: '2024-09-16T08:53:17.932+02:00',
      },
      {
        name: 'LAS.CONVERSION',
        displayName: 'Konvertering',
        created: '2024-09-16T08:53:17.933+02:00',
      },
      {
        name: 'LAS.LAS',
        displayName: 'LAS',
        created: '2024-09-16T08:53:17.933+02:00',
      },
      {
        name: 'LAS.UNCATEGORIZED',
        displayName: 'Okategoriserat',
        escalationEmail: 'henrik.sandstrom@sundsvall.se',
        created: '2024-09-16T08:53:17.934+02:00',
      },
      {
        name: 'LAS.SEQUENCE',
        displayName: 'Turordning',
        created: '2024-09-16T08:53:17.934+02:00',
      },
      {
        name: 'LAS.OTHER',
        displayName: 'Övrigt',
        created: '2024-09-16T08:53:17.935+02:00',
      },
    ],
    created: '2023-09-27T08:04:27+02:00',
  },
  {
    name: 'SALARY',
    displayName: 'Lön',
    types: [
      {
        name: 'SALARY.EMPLOYMENT',
        displayName: 'Anställning',
        created: '2024-09-16T08:53:39.947+02:00',
      },
      {
        name: 'SALARY.EXTRA_DISBURSEMENT',
        displayName: 'Extra utbetalning',
        created: '2024-09-16T08:53:39.948+02:00',
      },
      {
        name: 'SALARY.ABSENCE',
        displayName: 'Frånvaro',
        created: '2024-09-16T08:53:39.949+02:00',
      },
      {
        name: 'SALARY.AUTHORITY_LETTER',
        displayName: 'Myndighetspost',
        created: '2024-09-16T08:53:39.95+02:00',
      },
      {
        name: 'SALARY.UNCATEGORIZED',
        displayName: 'Okategoriserat',
        escalationEmail: 'henrik.sandstrom@sundsvall.se',
        created: '2024-09-16T08:53:39.95+02:00',
      },
      {
        name: 'SALARY.POLITICIAN',
        displayName: 'Politiker',
        created: '2024-09-16T08:53:39.951+02:00',
      },
      {
        name: 'SALARY.SCHEDULE',
        displayName: 'Schema',
        created: '2024-09-16T08:53:39.951+02:00',
      },
      {
        name: 'SALARY.HOURLY_SUBSTITUTE',
        displayName: 'Timvikarie',
        created: '2024-09-16T08:53:39.952+02:00',
      },
      {
        name: 'SALARY.CONTACT_WANTED',
        displayName: 'Önskar kontakt',
        created: '2024-09-16T08:53:39.952+02:00',
      },
      {
        name: 'SALARY.OTHER',
        displayName: 'Övrigt',
        created: '2024-09-16T08:53:39.953+02:00',
      },
    ],
    created: '2023-09-27T08:04:27+02:00',
  },
  {
    name: 'MSVA',
    displayName: 'Mittsverige Vatten & Avfall',
    types: [
      {
        name: 'MSVA.EMPLOYMENT',
        displayName: 'Anställning',
        created: '2024-09-16T08:53:58.676+02:00',
      },
      {
        name: 'MSVA.EXTRA_DISBURSEMENT',
        displayName: 'Extra utbetalning',
        created: '2024-09-16T08:53:58.677+02:00',
      },
      {
        name: 'MSVA.ABSENCE',
        displayName: 'Frånvaro',
        created: '2024-09-16T08:53:58.678+02:00',
      },
      {
        name: 'MSVA.AUTHORITY_LETTER',
        displayName: 'Myndighetspost',
        created: '2024-09-16T08:53:58.678+02:00',
      },
      {
        name: 'MSVA.POLITICIAN',
        displayName: 'Politiker',
        created: '2024-09-16T08:53:58.679+02:00',
      },
      {
        name: 'MSVA.SCHEDULE',
        displayName: 'Schema',
        created: '2024-09-16T08:53:58.68+02:00',
      },
      {
        name: 'MSVA.HOURLY_SUBSTITUTE',
        displayName: 'Timvikarie',
        created: '2024-09-16T08:53:58.68+02:00',
      },
      {
        name: 'MSVA.CONTACT_WANTED',
        displayName: 'Önskar kontakt',
        created: '2024-09-16T08:53:58.681+02:00',
      },
      {
        name: 'MSVA.OTHER',
        displayName: 'Övrigt',
        created: '2024-09-16T08:53:58.681+02:00',
      },
    ],
    created: '2023-09-27T08:04:27+02:00',
  },
  {
    name: 'ORGANIZATION',
    displayName: 'Organisation',
    types: [
      {
        name: 'ORGANIZATION.EMPLOYMENT',
        displayName: 'Anställning',
        created: '2024-09-16T12:41:19.692+02:00',
      },
    ],
    created: '2024-09-16T12:41:19.691+02:00',
  },
  {
    name: 'PENSION',
    displayName: 'Pension',
    types: [
      {
        name: 'PENSION.80_90_100',
        displayName: '80/90/100',
        created: '2024-09-16T08:54:14.662+02:00',
      },
      {
        name: 'PENSION.EMPLOYMENT_ENDING',
        displayName: 'Avslut av anställning',
        created: '2024-09-16T08:54:14.663+02:00',
      },
      {
        name: 'PENSION.MIXED',
        displayName: 'Blandat',
        created: '2024-09-16T08:54:14.663+02:00',
      },
      {
        name: 'PENSION.SALARY_EXCHANGE',
        displayName: 'Löneväxling',
        created: '2024-09-16T08:54:14.664+02:00',
      },
      {
        name: 'PENSION.UNCATEGORIZED',
        displayName: 'Okategoriserat',
        escalationEmail: 'henrik.sandstrom@sundsvall.se',
        created: '2024-09-16T08:54:14.664+02:00',
      },
      {
        name: 'PENSION.PENSION_GIFT',
        displayName: 'Pensionsgåva',
        created: '2024-09-16T08:54:14.665+02:00',
      },
      {
        name: 'PENSION.ORGANIZATION_TRANSFORMATION',
        displayName: 'Verksamhetsförändringar',
        created: '2024-09-16T08:54:14.665+02:00',
      },
    ],
    created: '2023-09-27T08:04:27+02:00',
  },
  {
    name: 'RESCUE_SERVICE',
    displayName: 'Räddningstjänsten',
    types: [
      {
        name: 'RESCUE_SERVICE.EMPLOYMENT',
        displayName: 'Anställning',
        created: '2024-09-16T08:54:31.545+02:00',
      },
      {
        name: 'RESCUE_SERVICE.PART_TIME_FIREFIGHTERS',
        displayName: 'Deltidsbrandmän',
        created: '2024-09-16T08:54:31.546+02:00',
      },
      {
        name: 'RESCUE_SERVICE.EXTRA_DISBURSEMENT',
        displayName: 'Extra utbetalning',
        created: '2024-09-16T08:54:31.547+02:00',
      },
      {
        name: 'RESCUE_SERVICE.ABSENCE',
        displayName: 'Frånvaro',
        created: '2024-09-16T08:54:31.547+02:00',
      },
      {
        name: 'RESCUE_SERVICE.AUTHORITY_LETTER',
        displayName: 'Myndighetspost',
        created: '2024-09-16T08:54:31.548+02:00',
      },
      {
        name: 'RESCUE_SERVICE.UNCATEGORIZED',
        displayName: 'Okategoriserat',
        escalationEmail: 'henrik.sandstrom@sundsvall.se',
        created: '2024-09-16T08:54:31.549+02:00',
      },
      {
        name: 'RESCUE_SERVICE.POLITICIAN',
        displayName: 'Politiker',
        created: '2024-09-16T08:54:31.549+02:00',
      },
      {
        name: 'RESCUE_SERVICE.SCHEDULE',
        displayName: 'Schema',
        created: '2024-09-16T08:54:31.55+02:00',
      },
      {
        name: 'RESCUE_SERVICE.HOURLY_SUBSTITUTE',
        displayName: 'Timvikarie',
        created: '2024-09-16T08:54:31.55+02:00',
      },
      {
        name: 'RESCUE_SERVICE.CONTACT_WANTED',
        displayName: 'Önskar kontakt',
        created: '2024-09-16T08:54:31.551+02:00',
      },
      {
        name: 'RESCUE_SERVICE.OTHER',
        displayName: 'Övrigt',
        created: '2024-09-16T08:54:31.551+02:00',
      },
    ],
    created: '2023-09-27T08:04:27+02:00',
  },
  {
    name: 'STATISTICS',
    displayName: 'Statistik',
    types: [
      {
        name: 'STATISTICS.INVOICED',
        displayName: 'Faktureras',
        created: '2024-09-16T08:54:48.237+02:00',
      },
      {
        name: 'STATISTICS.INTERNAL',
        displayName: 'Internt',
        created: '2024-09-16T08:54:48.238+02:00',
      },
      {
        name: 'STATISTICS.PUBLIC_DOCUMENT',
        displayName: 'Offentlig handling',
        created: '2024-09-16T08:54:48.239+02:00',
      },
      {
        name: 'STATISTICS.UNCATEGORIZED',
        displayName: 'Okategoriserat',
        escalationEmail: 'henrik.sandstrom@sundsvall.se',
        created: '2024-09-16T08:54:48.239+02:00',
      },
      {
        name: 'STATISTICS.QLICK',
        displayName: 'Qlick',
        created: '2024-09-16T08:54:48.24+02:00',
      },
      {
        name: 'STATISTICS.STATISTICS',
        displayName: 'Statistik',
        created: '2024-09-16T08:54:48.24+02:00',
      },
      {
        name: 'STATISTICS.OTHER',
        displayName: 'Övrigt',
        created: '2024-09-16T08:54:48.241+02:00',
      },
    ],
    created: '2023-09-27T08:04:27+02:00',
  },
  {
    name: 'SEAB',
    displayName: 'Sundsvall Energi',
    types: [
      {
        name: 'SEAB.EMPLOYMENT',
        displayName: 'Anställning',
        created: '2024-09-16T08:55:03.263+02:00',
      },
      {
        name: 'SEAB.EXTRA_DISBURSEMENT',
        displayName: 'Extra utbetalning',
        created: '2024-09-16T08:55:03.264+02:00',
      },
      {
        name: 'SEAB.ABSENCE',
        displayName: 'Frånvaro',
        created: '2024-09-16T08:55:03.265+02:00',
      },
      {
        name: 'SEAB.AUTHORITY_LETTER',
        displayName: 'Myndighetspost',
        created: '2024-09-16T08:55:03.265+02:00',
      },
      {
        name: 'SEAB.POLITICIAN',
        displayName: 'Politiker',
        created: '2024-09-16T08:55:03.266+02:00',
      },
      {
        name: 'SEAB.SCHEDULE',
        displayName: 'Schema',
        created: '2024-09-16T08:55:03.266+02:00',
      },
      {
        name: 'SEAB.HOURLY_SUBSTITUTE',
        displayName: 'Timvikarie',
        created: '2024-09-16T08:55:03.267+02:00',
      },
      {
        name: 'SEAB.CONTACT_WANTED',
        displayName: 'Önskar kontakt',
        created: '2024-09-16T08:55:03.267+02:00',
      },
      {
        name: 'SEAB.OTHER',
        displayName: 'Övrigt',
        created: '2024-09-16T08:55:03.268+02:00',
      },
    ],
    created: '2023-09-27T08:04:27+02:00',
  },
  {
    name: 'SYSTEM_MANAGEMENT',
    displayName: 'Systemförvaltning',
    types: [
      {
        name: 'SYSTEM_MANAGEMENT.ADATO',
        displayName: 'ADATO',
        created: '2024-09-16T08:55:22.445+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.AGDI',
        displayName: 'AGDI',
        created: '2024-09-16T08:55:22.445+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.ADATO_STELLA',
        displayName: 'Adato/stella',
        created: '2024-09-16T08:55:22.446+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.PERMISSIONS',
        displayName: 'Behörigheter',
        created: '2024-09-16T08:55:22.447+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.BASIC_DATA',
        displayName: 'Grunddata',
        created: '2024-09-16T08:55:22.447+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.INTERNAL',
        displayName: 'Interna ärenden',
        created: '2024-09-16T08:55:22.448+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.SALARY_AND_WORKING_HOURS',
        displayName: 'Lön och arbetstid',
        created: '2024-09-16T08:55:22.448+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.WAGE_REVISION',
        displayName: 'Löneöversyn',
        created: '2024-09-16T08:55:22.449+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.NOVI',
        displayName: 'Novi',
        created: '2024-09-16T08:55:22.45+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.UNCATEGORIZED',
        displayName: 'Okategoriserat',
        escalationEmail: 'henrik.sandstrom@sundsvall.se',
        created: '2024-09-16T08:55:22.45+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.ORGANIZATION_TRANSFORMATION',
        displayName: 'Organisationsförändringar',
        created: '2024-09-16T08:55:22.451+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.RPA_AND_E_SERVICES',
        displayName: 'RPA/e-tjänster',
        created: '2024-09-16T08:55:22.451+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.STELLA',
        displayName: 'Stella',
        created: '2024-09-16T08:55:22.452+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.VISMA_RECRUIT',
        displayName: 'Visma recruit',
        created: '2024-09-16T08:55:22.453+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.WARNA_TOLKEN',
        displayName: 'Wärna/tolken',
        created: '2024-09-16T08:55:22.453+02:00',
      },
      {
        name: 'SYSTEM_MANAGEMENT.OTHER',
        displayName: 'Övrigt',
        created: '2024-09-16T08:55:22.454+02:00',
      },
    ],
    created: '2023-09-27T08:04:27+02:00',
  },
  {
    name: 'OTHER_COMPANIES',
    displayName: 'Övriga bolag',
    types: [
      {
        name: 'OTHER_COMPANIES.EMPLOYMENT',
        displayName: 'Anställning',
        created: '2024-09-16T08:55:41.593+02:00',
      },
      {
        name: 'OTHER_COMPANIES.EXTRA_DISBURSEMENT',
        displayName: 'Extra utbetalning',
        created: '2024-09-16T08:55:41.594+02:00',
      },
      {
        name: 'OTHER_COMPANIES.ABSENCE',
        displayName: 'Frånvaro',
        created: '2024-09-16T08:55:41.595+02:00',
      },
      {
        name: 'OTHER_COMPANIES.AUTHORITY_LETTER',
        displayName: 'Myndighetspost',
        created: '2024-09-16T08:55:41.596+02:00',
      },
      {
        name: 'OTHER_COMPANIES.POLITICIAN',
        displayName: 'Politiker',
        created: '2024-09-16T08:55:41.596+02:00',
      },
      {
        name: 'OTHER_COMPANIES.SCHEDULE',
        displayName: 'Schema',
        created: '2024-09-16T08:55:41.597+02:00',
      },
      {
        name: 'OTHER_COMPANIES.HOURLY_SUBSTITUTE',
        displayName: 'Timvikarie',
        created: '2024-09-16T08:55:41.598+02:00',
      },
      {
        name: 'OTHER_COMPANIES.CONTACT_WANTED',
        displayName: 'Önskar kontakt',
        created: '2024-09-16T08:55:41.598+02:00',
      },
      {
        name: 'OTHER_COMPANIES.OTHER',
        displayName: 'Övrigt',
        created: '2024-09-16T08:55:41.599+02:00',
      },
    ],
    created: '2023-09-27T08:04:27+02:00',
  },
];

export const mockMetaData: MetadataResponse = {
  categories: mockCategories,
  labels: {
    created: '2023-09-27T08:04:28+02:00',
    modified: '2024-09-16T12:45:17.314+02:00',
    labelStructure: [
      {
        classification: 'CATEGORY',
        displayName: 'Administration',
        name: 'ADMINISTRATION',
        labels: [
          {
            classification: 'TYPE',
            displayName: 'Behörighet',
            name: 'ADMINISTRATION.PERMISSION',
          },
        ],
      },
      {
        classification: 'CATEGORY',
        displayName: 'Organisation',
        name: 'ORGANIZATION',
        labels: [
          {
            classification: 'TYPE',
            displayName: 'Anställning',
            name: 'ORGANIZATION.EMPLOYMENT',
          },
        ],
      },
      {
        classification: 'CATEGORY',
        displayName: 'Elnät/Servanet',
        name: 'ELECTRICITY_SERVANET',
        labels: [
          {
            classification: 'TYPE',
            displayName: 'Anställning',
            name: 'ELECTRICITY_SERVANET.EMPLOYMENT',
            labels: [
              {
                classification: 'SUBTYPE',
                displayName: 'Avslut',
                name: 'ELECTRICITY_SERVANET.EMPLOYMENT.TERMINATION_OF_EMPLOYMENT',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Nyanställning',
                name: 'ELECTRICITY_SERVANET.EMPLOYMENT.NEW_EMPLOYMENT',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Verksamhetsförändring',
                name: 'ELECTRICITY_SERVANET.EMPLOYMENT.ORGANIZATION_TRANSFORMATION',
              },
            ],
          },
          {
            classification: 'TYPE',
            displayName: 'Extra utbetalning',
            name: 'ELECTRICITY_SERVANET.EXTRA_DISBURSEMENT',
            labels: [
              {
                classification: 'SUBTYPE',
                displayName: 'Nordea',
                name: 'ELECTRICITY_SERVANET.EXTRA_DISBURSEMENT.NORDEA',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Pengar åter',
                name: 'ELECTRICITY_SERVANET.EXTRA_DISBURSEMENT.REFUND',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Snabbfax',
                name: 'ELECTRICITY_SERVANET.EXTRA_DISBURSEMENT.FAX_MACHINE',
              },
            ],
          },
          {
            classification: 'TYPE',
            displayName: 'Frånvaro',
            name: 'ELECTRICITY_SERVANET.ABSENCE',
            labels: [
              {
                classification: 'SUBTYPE',
                displayName: 'Föräldrarledighet',
                name: 'ELECTRICITY_SERVANET.ABSENCE.PARENTAL_LEAVE',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Semester',
                name: 'ELECTRICITY_SERVANET.ABSENCE.VACATION',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Sjukfrånvaro',
                name: 'ELECTRICITY_SERVANET.ABSENCE.SICKNESS_ABSENCE',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Tjänstledighet',
                name: 'ELECTRICITY_SERVANET.ABSENCE.LEAVE_OF_ABSENCE',
              },
            ],
          },
          {
            classification: 'TYPE',
            displayName: 'Myndighetspost',
            name: 'ELECTRICITY_SERVANET.AUTHORITY_LETTER',
            labels: [
              {
                classification: 'SUBTYPE',
                displayName: 'Afa',
                name: 'ELECTRICITY_SERVANET.AUTHORITY_LETTER.AFA',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Försäkringskassan',
                name: 'ELECTRICITY_SERVANET.AUTHORITY_LETTER.SSIA',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Intyg',
                name: 'ELECTRICITY_SERVANET.AUTHORITY_LETTER.CERTIFICATE',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Kronofogden',
                name: 'ELECTRICITY_SERVANET.AUTHORITY_LETTER.CROWN_BAILIFF',
              },
            ],
          },
          {
            classification: 'TYPE',
            displayName: 'Politiker',
            name: 'ELECTRICITY_SERVANET.POLITICIAN',
            labels: [
              {
                classification: 'SUBTYPE',
                displayName: 'Beslutsexpediering',
                name: 'ELECTRICITY_SERVANET.POLITICIAN.DECISION_DISPATCH',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Intyg',
                name: 'ELECTRICITY_SERVANET.POLITICIAN.CERTIFICATE',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Närvarolistor',
                name: 'ELECTRICITY_SERVANET.POLITICIAN.ATTENDANCE_LIST',
              },
            ],
          },
          {
            classification: 'TYPE',
            displayName: 'Schema',
            name: 'ELECTRICITY_SERVANET.SCHEDULE',
            labels: [
              {
                classification: 'SUBTYPE',
                displayName: 'Arbetsförändring',
                name: 'ELECTRICITY_SERVANET.SCHEDULE.JOB_CHANGE',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Scheman',
                name: 'ELECTRICITY_SERVANET.SCHEDULE.SCHEDULE',
              },
            ],
          },
          {
            classification: 'TYPE',
            displayName: 'Timvikarie',
            name: 'ELECTRICITY_SERVANET.HOURLY_SUBSTITUTE',
            labels: [
              {
                classification: 'SUBTYPE',
                displayName: 'Anhörigvårdare',
                name: 'ELECTRICITY_SERVANET.HOURLY_SUBSTITUTE.RELATIVE_CAREGIVER',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Ferieungdomar',
                name: 'ELECTRICITY_SERVANET.HOURLY_SUBSTITUTE.VACATION_YOUTHS',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Kontaktperson',
                name: 'ELECTRICITY_SERVANET.HOURLY_SUBSTITUTE.CONTACT_PERSON',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Ledsagare',
                name: 'ELECTRICITY_SERVANET.HOURLY_SUBSTITUTE.COMPANION',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Timanställning',
                name: 'ELECTRICITY_SERVANET.HOURLY_SUBSTITUTE.HOURLY_EMPLOYED',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Tjänstgörngsrapport',
                name: 'ELECTRICITY_SERVANET.HOURLY_SUBSTITUTE.DUTY_REPORT',
              },
            ],
          },
          {
            classification: 'TYPE',
            displayName: 'Önskar kontakt',
            name: 'ELECTRICITY_SERVANET.CONTACT_WANTED',
          },
          {
            classification: 'TYPE',
            displayName: 'Övrigt',
            name: 'ELECTRICITY_SERVANET.OTHER',
            labels: [
              {
                classification: 'SUBTYPE',
                displayName: 'Blandat',
                name: 'ELECTRICITY_SERVANET.OTHER.MIXED',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Listor',
                name: 'ELECTRICITY_SERVANET.OTHER.LISTS',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Lönefråga',
                name: 'ELECTRICITY_SERVANET.OTHER.SALARY_INQUIRY',
              },
              {
                classification: 'SUBTYPE',
                displayName: 'Omkontering',
                name: 'ELECTRICITY_SERVANET.OTHER.RE_ACCOUNTING',
              },
            ],
          },
        ],
      },
    ],
  },
  externalIdTypes: [
    {
      name: 'EMPLOYEE',
      created: '2023-03-27T11:43:58.429+02:00',
    },
    {
      name: 'ENTERPRISE',
      created: '2023-03-27T11:43:58.429+02:00',
    },
    {
      name: 'PRIVATE',
      created: '2023-03-27T11:43:58.429+02:00',
    },
  ],
  statuses: [
    {
      name: 'NEW',
      created: '2023-03-27T11:41:43.312+02:00',
    },
    {
      name: 'ONGOING',
      created: '2023-03-27T11:41:52.26+02:00',
    },
    {
      name: 'SUSPENDED',
      created: '2023-03-27T11:41:56.59+02:00',
    },
    {
      name: 'SOLVED',
      created: '2023-03-27T11:42:00.538+02:00',
    },
  ],
  roles: [
    {
      created: '2024-11-04T16:24:46.147+01:00',
      displayName: 'Godkännande chef',
      name: 'APPROVER',
    },
    {
      created: '2024-11-04T16:21:54.435+01:00',
      displayName: 'Kontaktperson',
      name: 'CONTACT',
    },
    {
      created: '2024-10-17T15:24:58.371+02:00',
      displayName: 'Anställd',
      name: 'EMPLOYEE',
    },
    {
      created: '2024-10-17T15:25:27.503+02:00',
      displayName: 'Chef',
      name: 'MANAGER',
    },
    {
      created: '2024-11-04T16:21:45.904+01:00',
      displayName: 'Ärendeägare',
      name: 'PRIMARY',
    },
    {
      created: '2024-11-04T16:24:52.231+01:00',
      displayName: 'Ersättare',
      name: 'SUBSTITUTE',
    },
    {
      created: '2024-10-17T15:26:01.175+02:00',
      displayName: 'Användare',
      name: 'USER',
    },
  ],
  contactReasons: [
    {
      reason: 'E-tjänst hittas inte',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'Övrigt',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'Valde personlig kontakt',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'Synpunkt',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'Problem med digitala verktyg',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'Klagomål',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'Information svår att förstå',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'Information felaktig',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'Information saknas',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'Information hittas inte',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'Felanmälan',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
    {
      reason: 'E-tjänst saknas',
      created: '2024-05-27T15:15:00+02:00',
      modified: '2024-05-27T15:15:00+02:00',
    },
  ],
};
