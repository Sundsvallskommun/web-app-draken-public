import { MetadataResponse } from '@common/data-contracts/supportmanagement/data-contracts';

export const mockCategories = [
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
        { name: 'ELECTRICITY_SERVANET.ABSENCE', displayName: 'Frånvaro', created: '2024-09-16T08:52:51.217+02:00' },
        { name: 'ELECTRICITY_SERVANET.GURU_FILE', displayName: 'Guru-Fil', created: '2024-10-15T11:00:00.214+02:00' },
        {
          name: 'ELECTRICITY_SERVANET.AUTHORITY_LETTER',
          displayName: 'Myndighetspost',
          created: '2024-09-16T08:52:51.217+02:00',
        },
        {
          name: 'ELECTRICITY_SERVANET.UNCATAGORIZED',
          displayName: 'Okategoriserat',
          created: '2024-10-15T11:00:00.214+02:00',
        },
        { name: 'ELECTRICITY_SERVANET.POLITICIAN', displayName: 'Politiker', created: '2024-09-16T08:52:51.218+02:00' },
        { name: 'ELECTRICITY_SERVANET.SCHEDULE', displayName: 'Schema', created: '2024-09-16T08:52:51.218+02:00' },
        {
          name: 'ELECTRICITY_SERVANET.HOURLY_SUBSTITUTE',
          displayName: 'Timvikarie',
          created: '2024-09-16T08:52:51.219+02:00',
        },
        {
          name: 'ELECTRICITY_SERVANET',
          displayName: 'testc1',
          escalationEmail: '',
          created: '2025-10-21T22:06:30.448+02:00',
        },
        {
          name: 'ELECTRICITY_SERVANET.CONTACT_WANTED',
          displayName: 'Önskar kontakt',
          created: '2024-09-16T08:52:51.219+02:00',
        },
        { name: 'ELECTRICITY_SERVANET.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:52:51.22+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'LAS',
      displayName: 'Las',
      types: [
        { name: 'LAS.PRECEDENCE', displayName: 'Företräde', created: '2024-09-16T08:53:17.931+02:00' },
        { name: 'LAS.SSIA', displayName: 'Försäkringskassan', created: '2024-09-16T08:53:17.932+02:00' },
        { name: 'LAS.CONVERSION', displayName: 'Konvertering', created: '2024-09-16T08:53:17.933+02:00' },
        { name: 'LAS.LAS', displayName: 'LAS', created: '2024-09-16T08:53:17.933+02:00' },
        {
          name: 'LAS.UNCATEGORIZED',
          displayName: 'Okategoriserat',
          escalationEmail: 'henrik.sandstrom@sundsvall.se',
          created: '2024-09-16T08:53:17.934+02:00',
        },
        { name: 'LAS.SEQUENCE', displayName: 'Turordning', created: '2024-09-16T08:53:17.934+02:00' },
        { name: 'LAS.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:53:17.935+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
      modified: '2024-11-05T12:05:57.018+01:00',
    },
    {
      name: 'SALARY',
      displayName: 'Lön',
      types: [
        {
          name: 'SALARY.EMPLOYMENT',
          displayName: 'Anställning',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.004+01:00',
        },
        {
          name: 'SALARY.EXTRA_DISBURSEMENT',
          displayName: 'Extra utbetalning',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.006+01:00',
        },
        {
          name: 'SALARY.ABSENCE',
          displayName: 'Frånvaro',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.006+01:00',
        },
        {
          name: 'SALARY.AUTHORITY_LETTER',
          displayName: 'Myndighetspost',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.007+01:00',
        },
        {
          name: 'SALARY.UNCATEGORIZED',
          displayName: 'Okategoriserat',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.007+01:00',
        },
        {
          name: 'SALARY.POLITICIAN',
          displayName: 'Politiker',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.008+01:00',
        },
        {
          name: 'SALARY.SCHEDULE',
          displayName: 'Schema',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.009+01:00',
        },
        { name: 'SALARY.DEBTS', displayName: 'Skulder', escalationEmail: '', created: '2024-11-05T13:22:31.71+01:00' },
        {
          name: 'SALARY.HOURLY_SUBSTITUTE',
          displayName: 'Timvikarie',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.009+01:00',
        },
        {
          name: 'SALARY.CONTACT_WANTED',
          displayName: 'Önskar kontakt',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.01+01:00',
        },
        { name: 'SALARY.OTHER', displayName: 'Övrigt', escalationEmail: '', created: '2024-11-05T13:16:43.01+01:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'MSVA',
      displayName: 'Mittsverige Vatten & Avfall',
      types: [
        { name: 'MSVA.EMPLOYMENT', displayName: 'Anställning', created: '2024-09-16T08:53:58.676+02:00' },
        { name: 'MSVA.EXTRA_DISBURSEMENT', displayName: 'Extra utbetalning', created: '2024-09-16T08:53:58.677+02:00' },
        { name: 'MSVA.ABSENCE', displayName: 'Frånvaro', created: '2024-09-16T08:53:58.678+02:00' },
        { name: 'MSVA.GURU_FILE', displayName: 'Guru-Fil', created: '2024-10-14T10:53:58.676+02:00' },
        { name: 'MSVA.AUTHORITY_LETTER', displayName: 'Myndighetspost', created: '2024-09-16T08:53:58.678+02:00' },
        { name: 'MSVA.POLITICIAN', displayName: 'Politiker', created: '2024-09-16T08:53:58.679+02:00' },
        { name: 'MSVA.SCHEDULE', displayName: 'Schema', created: '2024-09-16T08:53:58.68+02:00' },
        { name: 'MSVA.DEBTS', displayName: 'Skulder', created: '2024-11-01T09:39:04.925+01:00' },
        { name: 'MSVA.HOURLY_SUBSTITUTE', displayName: 'Timvikarie', created: '2024-09-16T08:53:58.68+02:00' },
        { name: 'MSVA.CONTACT_WANTED', displayName: 'Önskar kontakt', created: '2024-09-16T08:53:58.681+02:00' },
        { name: 'MSVA.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:53:58.681+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'ABC',
      displayName: 'Nivå 1',
      types: [
        {
          name: 'ABC.DEF',
          displayName: 'Nivå 2',
          escalationEmail: 'kaltron.rexhaj@sundsvall.se',
          created: '2025-04-29T16:15:09.616+02:00',
        },
      ],
      created: '2025-04-29T16:10:37.518+02:00',
    },
    {
      name: 'PENSION',
      displayName: 'Pension',
      types: [
        { name: 'PENSION.80_90_100', displayName: '80/90/100', created: '2024-09-16T08:54:14.662+02:00' },
        {
          name: 'PENSION.EMPLOYMENT_ENDING',
          displayName: 'Avslut av anställning',
          created: '2024-09-16T08:54:14.663+02:00',
        },
        { name: 'PENSION.MIXED', displayName: 'Blandat', created: '2024-09-16T08:54:14.663+02:00' },
        { name: 'PENSION.SALARY_EXCHANGE', displayName: 'Löneväxling', created: '2024-09-16T08:54:14.664+02:00' },
        {
          name: 'PENSION.UNCATEGORIZED',
          displayName: 'Okategoriserat',
          escalationEmail: 'henrik.sandstrom@sundsvall.se',
          created: '2024-09-16T08:54:14.664+02:00',
        },
        { name: 'PENSION.PENSION_GIFT', displayName: 'Pensionsgåva', created: '2024-09-16T08:54:14.665+02:00' },
        {
          name: 'PENSION.ORGANIZATION_TRANSFORMATION',
          displayName: 'Verksamhetsförändringar',
          created: '2024-09-16T08:54:14.665+02:00',
        },
        {
          name: 'PENSION.TESTIGEN',
          displayName: 'test2232',
          escalationEmail: '',
          created: '2025-01-27T10:41:35.133+01:00',
        },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'RESCUE_SERVICE',
      displayName: 'Räddningstjänsten',
      types: [
        { name: 'RESCUE_SERVICE.EMPLOYMENT', displayName: 'Anställning', created: '2024-09-16T08:54:31.545+02:00' },
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
        { name: 'RESCUE_SERVICE.ABSENCE', displayName: 'Frånvaro', created: '2024-09-16T08:54:31.547+02:00' },
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
        { name: 'RESCUE_SERVICE.POLITICIAN', displayName: 'Politiker', created: '2024-09-16T08:54:31.549+02:00' },
        { name: 'RESCUE_SERVICE.SCHEDULE', displayName: 'Schema', created: '2024-09-16T08:54:31.55+02:00' },
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
        { name: 'RESCUE_SERVICE.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:54:31.551+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'STATISTICS',
      displayName: 'Statistik',
      types: [
        { name: 'STATISTICS.INVOICED', displayName: 'Faktureras', created: '2024-09-16T08:54:48.237+02:00' },
        { name: 'STATISTICS.INTERNAL', displayName: 'Internt', created: '2024-09-16T08:54:48.238+02:00' },
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
        { name: 'STATISTICS.QLICK', displayName: 'Qlick', created: '2024-09-16T08:54:48.24+02:00' },
        { name: 'STATISTICS.STATISTICS', displayName: 'Statistik', created: '2024-09-16T08:54:48.24+02:00' },
        {
          name: 'STATISTICS.TEST22',
          displayName: 'Test 22',
          escalationEmail: '',
          created: '2025-01-27T10:36:52.569+01:00',
        },
        { name: 'STATISTICS.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:54:48.241+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'SEAB',
      displayName: 'Sundsvall Energi',
      types: [
        { name: 'SEAB.EMPLOYMENT', displayName: 'Anställning', created: '2024-09-16T08:55:03.263+02:00' },
        { name: 'SEAB.EXTRA_DISBURSEMENT', displayName: 'Extra utbetalning', created: '2024-09-16T08:55:03.264+02:00' },
        { name: 'SEAB.ABSENCE', displayName: 'Frånvaro', created: '2024-09-16T08:55:03.265+02:00' },
        { name: 'SEAB.COME_GO', displayName: 'Kom/Gå', created: '2024-10-14T10:55:03.265+02:00' },
        { name: 'SEAB.AUTHORITY_LETTER', displayName: 'Myndighetspost', created: '2024-09-16T08:55:03.265+02:00' },
        { name: 'SEAB.UNCATEGORIZED', displayName: 'Okategoriserat', created: '2024-10-14T10:55:03.265+02:00' },
        { name: 'SEAB.POLITICIAN', displayName: 'Politiker', created: '2024-09-16T08:55:03.266+02:00' },
        { name: 'SEAB.SCHEDULE', displayName: 'Schema', created: '2024-09-16T08:55:03.266+02:00' },
        { name: 'SEAB.DEBTS', displayName: 'Skulder', created: '2024-11-01T09:41:22.783+01:00' },
        { name: 'SEAB.HOURLY_SUBSTITUTE', displayName: 'Timvikarie', created: '2024-09-16T08:55:03.267+02:00' },
        { name: 'SEAB.CONTACT_WANTED', displayName: 'Önskar kontakt', created: '2024-09-16T08:55:03.267+02:00' },
        { name: 'SEAB.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:55:03.268+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'SYSTEM_MANAGEMENT',
      displayName: 'Systemförvaltning',
      types: [
        { name: 'SYSTEM_MANAGEMENT.ADATO', displayName: 'ADATO', created: '2024-09-16T08:55:22.445+02:00' },
        {
          name: 'SYSTEM_MANAGEMENT.AGDI',
          displayName: 'AGDI/Ekonomi',
          created: '2024-09-16T08:55:22.445+02:00',
          modified: '2025-04-28T14:16:07.904+02:00',
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
        { name: 'SYSTEM_MANAGEMENT.BASIC_DATA', displayName: 'Grunddata', created: '2024-09-16T08:55:22.447+02:00' },
        {
          name: 'SYSTEM_MANAGEMENT.INTERNAL',
          displayName: 'Interna ärenden',
          created: '2024-09-16T08:55:22.448+02:00',
        },
        {
          name: 'SYSTEM_MANAGEMENT.COME_AND_GO',
          displayName: 'Kom o Gå',
          escalationEmail: '',
          created: '2025-04-28T14:16:07.902+02:00',
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
        { name: 'SYSTEM_MANAGEMENT.NOVI', displayName: 'Novi', created: '2024-09-16T08:55:22.45+02:00' },
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
        { name: 'SYSTEM_MANAGEMENT.STELLA', displayName: 'Stella', created: '2024-09-16T08:55:22.452+02:00' },
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
        { name: 'SYSTEM_MANAGEMENT.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:55:22.454+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'TEST1',
      displayName: 'testnivå1',
      types: [
        { name: 'KATNIV2', displayName: 'nivå2', escalationEmail: '', created: '2024-10-24T13:39:51.523+02:00' },
        { name: 'NIVA3', displayName: 'nivå3', escalationEmail: '', created: '2024-12-16T13:51:53.017+01:00' },
      ],
      created: '2024-10-24T13:39:01.878+02:00',
    },
    {
      name: 'OTHER_COMPANIES',
      displayName: 'Övriga bolag',
      types: [
        { name: 'OTHER_COMPANIES.EMPLOYMENT', displayName: 'Anställning', created: '2024-09-16T08:55:41.593+02:00' },
        {
          name: 'OTHER_COMPANIES.EXTRA_DISBURSEMENT',
          displayName: 'Extra utbetalning',
          created: '2024-09-16T08:55:41.594+02:00',
        },
        { name: 'OTHER_COMPANIES.ABSENCE', displayName: 'Frånvaro', created: '2024-09-16T08:55:41.595+02:00' },
        { name: 'OTHER_COMPANIES.PRECEDENCE', displayName: 'Företräde', created: '2024-09-30T14:40:17.931+02:00' },
        {
          name: 'OTHER_COMPANIES.AUTHORITY_LETTER',
          displayName: 'Myndighetspost',
          created: '2024-09-16T08:55:41.596+02:00',
        },
        {
          name: 'OTHER_COMPANIES.UNCATEGORIZED',
          displayName: 'Okategoriserat',
          created: '2024-10-14T10:55:41.597+02:00',
        },
        { name: 'OTHER_COMPANIES.POLITICIAN', displayName: 'Politiker', created: '2024-09-16T08:55:41.596+02:00' },
        { name: 'OTHER_COMPANIES.SCHEDULE', displayName: 'Schema', created: '2024-09-16T08:55:41.597+02:00' },
        { name: 'OTHER_COMPANIES.DEBTS', displayName: 'Skulder', created: '2024-11-01T09:43:49.805+01:00' },
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
        { name: 'OTHER_COMPANIES.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:55:41.599+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
  ];

export const mockMetaData: MetadataResponse = {
  categories: [
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
        { name: 'ELECTRICITY_SERVANET.ABSENCE', displayName: 'Frånvaro', created: '2024-09-16T08:52:51.217+02:00' },
        { name: 'ELECTRICITY_SERVANET.GURU_FILE', displayName: 'Guru-Fil', created: '2024-10-15T11:00:00.214+02:00' },
        {
          name: 'ELECTRICITY_SERVANET.AUTHORITY_LETTER',
          displayName: 'Myndighetspost',
          created: '2024-09-16T08:52:51.217+02:00',
        },
        {
          name: 'ELECTRICITY_SERVANET.UNCATAGORIZED',
          displayName: 'Okategoriserat',
          created: '2024-10-15T11:00:00.214+02:00',
        },
        { name: 'ELECTRICITY_SERVANET.POLITICIAN', displayName: 'Politiker', created: '2024-09-16T08:52:51.218+02:00' },
        { name: 'ELECTRICITY_SERVANET.SCHEDULE', displayName: 'Schema', created: '2024-09-16T08:52:51.218+02:00' },
        {
          name: 'ELECTRICITY_SERVANET.HOURLY_SUBSTITUTE',
          displayName: 'Timvikarie',
          created: '2024-09-16T08:52:51.219+02:00',
        },
        {
          name: 'ELECTRICITY_SERVANET',
          displayName: 'testc1',
          escalationEmail: '',
          created: '2025-10-21T22:06:30.448+02:00',
        },
        {
          name: 'ELECTRICITY_SERVANET.CONTACT_WANTED',
          displayName: 'Önskar kontakt',
          created: '2024-09-16T08:52:51.219+02:00',
        },
        { name: 'ELECTRICITY_SERVANET.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:52:51.22+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'LAS',
      displayName: 'Las',
      types: [
        { name: 'LAS.PRECEDENCE', displayName: 'Företräde', created: '2024-09-16T08:53:17.931+02:00' },
        { name: 'LAS.SSIA', displayName: 'Försäkringskassan', created: '2024-09-16T08:53:17.932+02:00' },
        { name: 'LAS.CONVERSION', displayName: 'Konvertering', created: '2024-09-16T08:53:17.933+02:00' },
        { name: 'LAS.LAS', displayName: 'LAS', created: '2024-09-16T08:53:17.933+02:00' },
        {
          name: 'LAS.UNCATEGORIZED',
          displayName: 'Okategoriserat',
          escalationEmail: 'henrik.sandstrom@sundsvall.se',
          created: '2024-09-16T08:53:17.934+02:00',
        },
        { name: 'LAS.SEQUENCE', displayName: 'Turordning', created: '2024-09-16T08:53:17.934+02:00' },
        { name: 'LAS.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:53:17.935+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
      modified: '2024-11-05T12:05:57.018+01:00',
    },
    {
      name: 'SALARY',
      displayName: 'Lön',
      types: [
        {
          name: 'SALARY.EMPLOYMENT',
          displayName: 'Anställning',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.004+01:00',
        },
        {
          name: 'SALARY.EXTRA_DISBURSEMENT',
          displayName: 'Extra utbetalning',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.006+01:00',
        },
        {
          name: 'SALARY.ABSENCE',
          displayName: 'Frånvaro',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.006+01:00',
        },
        {
          name: 'SALARY.AUTHORITY_LETTER',
          displayName: 'Myndighetspost',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.007+01:00',
        },
        {
          name: 'SALARY.UNCATEGORIZED',
          displayName: 'Okategoriserat',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.007+01:00',
        },
        {
          name: 'SALARY.POLITICIAN',
          displayName: 'Politiker',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.008+01:00',
        },
        {
          name: 'SALARY.SCHEDULE',
          displayName: 'Schema',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.009+01:00',
        },
        { name: 'SALARY.DEBTS', displayName: 'Skulder', escalationEmail: '', created: '2024-11-05T13:22:31.71+01:00' },
        {
          name: 'SALARY.HOURLY_SUBSTITUTE',
          displayName: 'Timvikarie',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.009+01:00',
        },
        {
          name: 'SALARY.CONTACT_WANTED',
          displayName: 'Önskar kontakt',
          escalationEmail: '',
          created: '2024-11-05T13:16:43.01+01:00',
        },
        { name: 'SALARY.OTHER', displayName: 'Övrigt', escalationEmail: '', created: '2024-11-05T13:16:43.01+01:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'MSVA',
      displayName: 'Mittsverige Vatten & Avfall',
      types: [
        { name: 'MSVA.EMPLOYMENT', displayName: 'Anställning', created: '2024-09-16T08:53:58.676+02:00' },
        { name: 'MSVA.EXTRA_DISBURSEMENT', displayName: 'Extra utbetalning', created: '2024-09-16T08:53:58.677+02:00' },
        { name: 'MSVA.ABSENCE', displayName: 'Frånvaro', created: '2024-09-16T08:53:58.678+02:00' },
        { name: 'MSVA.GURU_FILE', displayName: 'Guru-Fil', created: '2024-10-14T10:53:58.676+02:00' },
        { name: 'MSVA.AUTHORITY_LETTER', displayName: 'Myndighetspost', created: '2024-09-16T08:53:58.678+02:00' },
        { name: 'MSVA.POLITICIAN', displayName: 'Politiker', created: '2024-09-16T08:53:58.679+02:00' },
        { name: 'MSVA.SCHEDULE', displayName: 'Schema', created: '2024-09-16T08:53:58.68+02:00' },
        { name: 'MSVA.DEBTS', displayName: 'Skulder', created: '2024-11-01T09:39:04.925+01:00' },
        { name: 'MSVA.HOURLY_SUBSTITUTE', displayName: 'Timvikarie', created: '2024-09-16T08:53:58.68+02:00' },
        { name: 'MSVA.CONTACT_WANTED', displayName: 'Önskar kontakt', created: '2024-09-16T08:53:58.681+02:00' },
        { name: 'MSVA.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:53:58.681+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'ABC',
      displayName: 'Nivå 1',
      types: [
        {
          name: 'ABC.DEF',
          displayName: 'Nivå 2',
          escalationEmail: 'kaltron.rexhaj@sundsvall.se',
          created: '2025-04-29T16:15:09.616+02:00',
        },
      ],
      created: '2025-04-29T16:10:37.518+02:00',
    },
    {
      name: 'PENSION',
      displayName: 'Pension',
      types: [
        { name: 'PENSION.80_90_100', displayName: '80/90/100', created: '2024-09-16T08:54:14.662+02:00' },
        {
          name: 'PENSION.EMPLOYMENT_ENDING',
          displayName: 'Avslut av anställning',
          created: '2024-09-16T08:54:14.663+02:00',
        },
        { name: 'PENSION.MIXED', displayName: 'Blandat', created: '2024-09-16T08:54:14.663+02:00' },
        { name: 'PENSION.SALARY_EXCHANGE', displayName: 'Löneväxling', created: '2024-09-16T08:54:14.664+02:00' },
        {
          name: 'PENSION.UNCATEGORIZED',
          displayName: 'Okategoriserat',
          escalationEmail: 'henrik.sandstrom@sundsvall.se',
          created: '2024-09-16T08:54:14.664+02:00',
        },
        { name: 'PENSION.PENSION_GIFT', displayName: 'Pensionsgåva', created: '2024-09-16T08:54:14.665+02:00' },
        {
          name: 'PENSION.ORGANIZATION_TRANSFORMATION',
          displayName: 'Verksamhetsförändringar',
          created: '2024-09-16T08:54:14.665+02:00',
        },
        {
          name: 'PENSION.TESTIGEN',
          displayName: 'test2232',
          escalationEmail: '',
          created: '2025-01-27T10:41:35.133+01:00',
        },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'RESCUE_SERVICE',
      displayName: 'Räddningstjänsten',
      types: [
        { name: 'RESCUE_SERVICE.EMPLOYMENT', displayName: 'Anställning', created: '2024-09-16T08:54:31.545+02:00' },
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
        { name: 'RESCUE_SERVICE.ABSENCE', displayName: 'Frånvaro', created: '2024-09-16T08:54:31.547+02:00' },
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
        { name: 'RESCUE_SERVICE.POLITICIAN', displayName: 'Politiker', created: '2024-09-16T08:54:31.549+02:00' },
        { name: 'RESCUE_SERVICE.SCHEDULE', displayName: 'Schema', created: '2024-09-16T08:54:31.55+02:00' },
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
        { name: 'RESCUE_SERVICE.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:54:31.551+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'STATISTICS',
      displayName: 'Statistik',
      types: [
        { name: 'STATISTICS.INVOICED', displayName: 'Faktureras', created: '2024-09-16T08:54:48.237+02:00' },
        { name: 'STATISTICS.INTERNAL', displayName: 'Internt', created: '2024-09-16T08:54:48.238+02:00' },
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
        { name: 'STATISTICS.QLICK', displayName: 'Qlick', created: '2024-09-16T08:54:48.24+02:00' },
        { name: 'STATISTICS.STATISTICS', displayName: 'Statistik', created: '2024-09-16T08:54:48.24+02:00' },
        {
          name: 'STATISTICS.TEST22',
          displayName: 'Test 22',
          escalationEmail: '',
          created: '2025-01-27T10:36:52.569+01:00',
        },
        { name: 'STATISTICS.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:54:48.241+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'SEAB',
      displayName: 'Sundsvall Energi',
      types: [
        { name: 'SEAB.EMPLOYMENT', displayName: 'Anställning', created: '2024-09-16T08:55:03.263+02:00' },
        { name: 'SEAB.EXTRA_DISBURSEMENT', displayName: 'Extra utbetalning', created: '2024-09-16T08:55:03.264+02:00' },
        { name: 'SEAB.ABSENCE', displayName: 'Frånvaro', created: '2024-09-16T08:55:03.265+02:00' },
        { name: 'SEAB.COME_GO', displayName: 'Kom/Gå', created: '2024-10-14T10:55:03.265+02:00' },
        { name: 'SEAB.AUTHORITY_LETTER', displayName: 'Myndighetspost', created: '2024-09-16T08:55:03.265+02:00' },
        { name: 'SEAB.UNCATEGORIZED', displayName: 'Okategoriserat', created: '2024-10-14T10:55:03.265+02:00' },
        { name: 'SEAB.POLITICIAN', displayName: 'Politiker', created: '2024-09-16T08:55:03.266+02:00' },
        { name: 'SEAB.SCHEDULE', displayName: 'Schema', created: '2024-09-16T08:55:03.266+02:00' },
        { name: 'SEAB.DEBTS', displayName: 'Skulder', created: '2024-11-01T09:41:22.783+01:00' },
        { name: 'SEAB.HOURLY_SUBSTITUTE', displayName: 'Timvikarie', created: '2024-09-16T08:55:03.267+02:00' },
        { name: 'SEAB.CONTACT_WANTED', displayName: 'Önskar kontakt', created: '2024-09-16T08:55:03.267+02:00' },
        { name: 'SEAB.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:55:03.268+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'SYSTEM_MANAGEMENT',
      displayName: 'Systemförvaltning',
      types: [
        { name: 'SYSTEM_MANAGEMENT.ADATO', displayName: 'ADATO', created: '2024-09-16T08:55:22.445+02:00' },
        {
          name: 'SYSTEM_MANAGEMENT.AGDI',
          displayName: 'AGDI/Ekonomi',
          created: '2024-09-16T08:55:22.445+02:00',
          modified: '2025-04-28T14:16:07.904+02:00',
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
        { name: 'SYSTEM_MANAGEMENT.BASIC_DATA', displayName: 'Grunddata', created: '2024-09-16T08:55:22.447+02:00' },
        {
          name: 'SYSTEM_MANAGEMENT.INTERNAL',
          displayName: 'Interna ärenden',
          created: '2024-09-16T08:55:22.448+02:00',
        },
        {
          name: 'SYSTEM_MANAGEMENT.COME_AND_GO',
          displayName: 'Kom o Gå',
          escalationEmail: '',
          created: '2025-04-28T14:16:07.902+02:00',
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
        { name: 'SYSTEM_MANAGEMENT.NOVI', displayName: 'Novi', created: '2024-09-16T08:55:22.45+02:00' },
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
        { name: 'SYSTEM_MANAGEMENT.STELLA', displayName: 'Stella', created: '2024-09-16T08:55:22.452+02:00' },
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
        { name: 'SYSTEM_MANAGEMENT.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:55:22.454+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
    {
      name: 'TEST1',
      displayName: 'testnivå1',
      types: [
        { name: 'KATNIV2', displayName: 'nivå2', escalationEmail: '', created: '2024-10-24T13:39:51.523+02:00' },
        { name: 'NIVA3', displayName: 'nivå3', escalationEmail: '', created: '2024-12-16T13:51:53.017+01:00' },
      ],
      created: '2024-10-24T13:39:01.878+02:00',
    },
    {
      name: 'OTHER_COMPANIES',
      displayName: 'Övriga bolag',
      types: [
        { name: 'OTHER_COMPANIES.EMPLOYMENT', displayName: 'Anställning', created: '2024-09-16T08:55:41.593+02:00' },
        {
          name: 'OTHER_COMPANIES.EXTRA_DISBURSEMENT',
          displayName: 'Extra utbetalning',
          created: '2024-09-16T08:55:41.594+02:00',
        },
        { name: 'OTHER_COMPANIES.ABSENCE', displayName: 'Frånvaro', created: '2024-09-16T08:55:41.595+02:00' },
        { name: 'OTHER_COMPANIES.PRECEDENCE', displayName: 'Företräde', created: '2024-09-30T14:40:17.931+02:00' },
        {
          name: 'OTHER_COMPANIES.AUTHORITY_LETTER',
          displayName: 'Myndighetspost',
          created: '2024-09-16T08:55:41.596+02:00',
        },
        {
          name: 'OTHER_COMPANIES.UNCATEGORIZED',
          displayName: 'Okategoriserat',
          created: '2024-10-14T10:55:41.597+02:00',
        },
        { name: 'OTHER_COMPANIES.POLITICIAN', displayName: 'Politiker', created: '2024-09-16T08:55:41.596+02:00' },
        { name: 'OTHER_COMPANIES.SCHEDULE', displayName: 'Schema', created: '2024-09-16T08:55:41.597+02:00' },
        { name: 'OTHER_COMPANIES.DEBTS', displayName: 'Skulder', created: '2024-11-01T09:43:49.805+01:00' },
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
        { name: 'OTHER_COMPANIES.OTHER', displayName: 'Övrigt', created: '2024-09-16T08:55:41.599+02:00' },
      ],
      created: '2023-09-27T08:04:27+02:00',
    },
  ],
  labels: {
      labelStructure: [
        {
          id: '072f6325-f35c-4bcf-89ac-dd1b71d340e6',
          classification: 'CATEGORY',
          displayName: 'Pension',
          
          resourcePath: 'PENSION',
          resourceName: 'PENSION',
          labels: [
            {
              id: '2b5c81e8-4ee8-40a9-95f1-31e6fa485459',
              classification: 'TYPE',
              displayName: 'Verksamhetsförändringar',
              
              resourcePath: 'PENSION/ORGANIZATION_TRANSFORMATION',
              resourceName: 'ORGANIZATION_TRANSFORMATION',
              labels: [],
            },
            {
              id: '2c8b4120-ed7e-4310-a455-041205af7ff7',
              classification: 'TYPE',
              displayName: '80/90/100',
              
              resourcePath: 'PENSION/80_90_100',
              resourceName: '80_90_100',
              labels: [],
            },
            {
              id: '69ca053b-75a5-40b6-b5f3-e635d1ca9ab8',
              classification: 'TYPE',
              displayName: 'Avslut av anställning',
              
              resourcePath: 'PENSION/EMPLOYMENT_ENDING',
              resourceName: 'EMPLOYMENT_ENDING',
              labels: [],
            },
            {
              id: '6a7a5324-5e1e-4837-8e7b-33b3b45d26eb',
              classification: 'TYPE',
              displayName: 'Löneväxling',
              
              resourcePath: 'PENSION/SALARY_EXCHANGE',
              resourceName: 'SALARY_EXCHANGE',
              labels: [],
            },
            {
              id: 'cd50c5f2-db87-4350-afd9-a96bc01f2db2',
              classification: 'TYPE',
              displayName: 'Blandat',
              
              resourcePath: 'PENSION/MIXED',
              resourceName: 'MIXED',
              labels: [],
            },
            {
              id: 'dae7a7f8-d97b-4e27-a133-c39266dc291c',
              classification: 'TYPE',
              displayName: 'Pensionsgåva',
              
              resourcePath: 'PENSION/PENSION_GIFT',
              resourceName: 'PENSION_GIFT',
              labels: [],
            },
            {
              id: 'e69ecd48-d12f-4b2e-81c8-6186f46cff84',
              classification: 'TYPE',
              displayName: 'Okategoriserat',
              
              resourcePath: 'PENSION/UNCATEGORIZED',
              resourceName: 'UNCATEGORIZED',
              labels: [
                {
                  id: '50f55260-bec7-4dbc-85f1-e1b5aed55909',
                  classification: 'SUBTYPE',
                  displayName: 'Okategoriserat',
                  
                  resourcePath: 'PENSION/UNCATEGORIZED/UNCATEGORIZED',
                  resourceName: 'UNCATEGORIZED',
                  labels: [],
                },
              ],
            },
          ],
        },
        {
          id: '2145ad39-6038-47f9-90a2-d1512440b84d',
          classification: 'CATEGORY',
          displayName: 'Las',
          
          resourcePath: 'LAS',
          resourceName: 'LAS',
          labels: [
            {
              id: '1c2721e4-3628-4974-8e0e-52e69ed2df86',
              classification: 'TYPE',
              displayName: 'Okategoriserat',
              
              resourcePath: 'LAS/UNCATEGORIZED',
              resourceName: 'UNCATEGORIZED',
              labels: [
                {
                  id: 'a46f962b-71b1-488f-ace1-5bb893732465',
                  classification: 'SUBTYPE',
                  displayName: 'Okategoriserat',
                  
                  resourcePath: 'LAS/UNCATEGORIZED/UNCATEGORIZED',
                  resourceName: 'UNCATEGORIZED',
                  labels: [],
                },
              ],
            },
            {
              id: '237f531c-d959-470d-a50d-b60a10b8f533',
              classification: 'TYPE',
              displayName: 'LAS',
              
              resourcePath: 'LAS/LAS',
              resourceName: 'LAS',
              labels: [],
            },
            {
              id: '87d6eba2-80f3-486a-882f-0d73f096f24a',
              classification: 'TYPE',
              displayName: 'Företräde',
              
              resourcePath: 'LAS/PRECEDENCE',
              resourceName: 'PRECEDENCE',
              labels: [],
            },
            {
              id: '94362b1a-4f46-4048-9c26-370070c846c2',
              classification: 'TYPE',
              displayName: 'Konvertering',
              
              resourcePath: 'LAS/CONVERSION',
              resourceName: 'CONVERSION',
              labels: [],
            },
            {
              id: '9d1010d3-f764-47f0-b397-22bc4e98c8f4',
              classification: 'TYPE',
              displayName: 'Övrigt',
              
              resourcePath: 'LAS/OTHER',
              resourceName: 'OTHER',
              labels: [],
            },
            {
              id: 'adb98900-069c-420d-a34f-6460d009abe0',
              classification: 'TYPE',
              displayName: 'Turordning',
              
              resourcePath: 'LAS/SEQUENCE',
              resourceName: 'SEQUENCE',
              labels: [],
            },
            {
              id: 'b02ec502-f0ae-4dbe-8442-5636aa80e49d',
              classification: 'TYPE',
              displayName: 'Försäkringskassan',
              
              resourcePath: 'LAS/SSIA',
              resourceName: 'SSIA',
              labels: [],
            },
          ],
        },
        {
          id: '32610d67-f22c-4e4d-af9d-1835401f51ae',
          classification: 'CATEGORY',
          displayName: 'Statistik',
          
          resourcePath: 'STATISTICS',
          resourceName: 'STATISTICS',
          labels: [
            {
              id: '1b87b25d-0922-4ca2-9fd9-92123188d753',
              classification: 'TYPE',
              displayName: 'Okategoriserat',
              
              resourcePath: 'STATISTICS/UNCATEGORIZED',
              resourceName: 'UNCATEGORIZED',
              labels: [
                {
                  id: '2db59865-4171-407b-97b7-131b90c59a2e',
                  classification: 'SUBTYPE',
                  displayName: 'Okategoriserat',
                  
                  resourcePath: 'STATISTICS/UNCATEGORIZED/UNCATEGORIZED',
                  resourceName: 'UNCATEGORIZED',
                  labels: [],
                },
              ],
            },
            {
              id: '1f3566b6-9c16-49c8-852a-22f0bffea5f5',
              classification: 'TYPE',
              displayName: 'Registerutdrag',
              
              resourcePath: 'STATISTICS/REGISTRY_EXTRACT',
              resourceName: 'REGISTRY_EXTRACT',
              labels: [],
            },
            {
              id: '3f50b807-222a-4d83-a29e-5d6b9204944f',
              classification: 'TYPE',
              displayName: 'Faktureras',
              
              resourcePath: 'STATISTICS/INVOICED',
              resourceName: 'INVOICED',
              labels: [],
            },
            {
              id: '475a4430-3790-4f98-ab7b-c706feced1b6',
              classification: 'TYPE',
              displayName: 'Övrigt',
              
              resourcePath: 'STATISTICS/OTHER',
              resourceName: 'OTHER',
              labels: [],
            },
            {
              id: '4ebfe3e2-7615-4236-a326-706501cdaf6b',
              classification: 'TYPE',
              displayName: 'Statistik',
              
              resourcePath: 'STATISTICS/STATISTICS',
              resourceName: 'STATISTICS',
              labels: [],
            },
            {
              id: 'ace62605-f7d5-4a8c-ab82-7ea0a0871238',
              classification: 'TYPE',
              displayName: 'Internt',
              
              resourcePath: 'STATISTICS/INTERNAL',
              resourceName: 'INTERNAL',
              labels: [],
            },
            {
              id: 'f06a6a4d-347c-4adc-a899-42736801e233',
              classification: 'TYPE',
              displayName: 'Qlick',
              
              resourcePath: 'STATISTICS/QLICK',
              resourceName: 'QLICK',
              labels: [],
            },
            {
              id: 'f5468406-9c9d-4df2-9e60-385d0e23e25d',
              classification: 'TYPE',
              displayName: 'Offentlig handling',
              
              resourcePath: 'STATISTICS/PUBLIC_DOCUMENT',
              resourceName: 'PUBLIC_DOCUMENT',
              labels: [],
            },
          ],
        },
        {
          id: '390f2a96-ea8c-4447-9319-58474552aba5',
          classification: 'CATEGORY',
          displayName: 'Mittsverige Vatten & Avfall',
          
          resourcePath: 'MSVA',
          resourceName: 'MSVA',
          labels: [
            {
              id: '06597d19-be38-47f6-8a20-e4790b8ca7c0',
              classification: 'TYPE',
              displayName: 'Anställning',
              
              resourcePath: 'MSVA/EMPLOYMENT',
              resourceName: 'EMPLOYMENT',
              labels: [
                {
                  id: '610f7707-762d-418e-9853-239f168b264b',
                  classification: 'SUBTYPE',
                  displayName: 'Anställning',
                  
                  resourcePath: 'MSVA/EMPLOYMENT/EMPLOYMENT',
                  resourceName: 'EMPLOYMENT',
                  labels: [],
                },
                {
                  id: '6343b756-a170-4b21-951e-876c1a48efef',
                  classification: 'SUBTYPE',
                  displayName: 'Nyanställning',
                  
                  resourcePath: 'MSVA/EMPLOYMENT/NEW_EMPLOYMENT',
                  resourceName: 'NEW_EMPLOYMENT',
                  labels: [],
                },
                {
                  id: '64b2524d-c57b-4b98-9383-5ca61b5a2fc7',
                  classification: 'SUBTYPE',
                  displayName: 'Avslut',
                  
                  resourcePath: 'MSVA/EMPLOYMENT/TERMINATION_OF_EMPLOYMENT',
                  resourceName: 'TERMINATION_OF_EMPLOYMENT',
                  labels: [],
                },
              ],
            },
            {
              id: '0e09cc5f-7d78-4d40-925d-ad89035502b7',
              classification: 'TYPE',
              displayName: 'Skulder',
              
              resourcePath: 'MSVA/DEBTS',
              resourceName: 'DEBTS',
              labels: [
                {
                  id: 'f8a62f15-cb35-4b1c-a65c-5406919e0290',
                  classification: 'SUBTYPE',
                  displayName: 'Skulder',
                  
                  resourcePath: 'MSVA/DEBTS/DEBTS',
                  resourceName: 'DEBTS',
                  labels: [],
                },
              ],
            },
            {
              id: '1813729d-2291-44e9-9a37-ab9f63a3fa63',
              classification: 'TYPE',
              displayName: 'Timvikarie',
              
              resourcePath: 'MSVA/HOURLY_SUBSTITUTE',
              resourceName: 'HOURLY_SUBSTITUTE',
              labels: [
                {
                  id: '20f9d4e6-6aa4-4063-aa7f-214a5fec3ef2',
                  classification: 'SUBTYPE',
                  displayName: 'Timanställning',
                  
                  resourcePath: 'MSVA/HOURLY_SUBSTITUTE/HOURLY_EMPLOYED',
                  resourceName: 'HOURLY_EMPLOYED',
                  labels: [],
                },
                {
                  id: 'dd02d6c9-7c62-4f2a-8527-9af80eac4718',
                  classification: 'SUBTYPE',
                  displayName: 'Anhörigvårdare',
                  
                  resourcePath: 'MSVA/HOURLY_SUBSTITUTE/RELATIVE_CAREGIVER',
                  resourceName: 'RELATIVE_CAREGIVER',
                  labels: [],
                },
                {
                  id: 'ed244065-b3b6-41b3-aedb-fa3d9fc7e678',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstgöringsrapport',
                  
                  resourcePath: 'MSVA/HOURLY_SUBSTITUTE/DUTY_REPORT',
                  resourceName: 'DUTY_REPORT',
                  labels: [],
                },
              ],
            },
            {
              id: '38d9385e-dff3-4a25-9bf1-0f6e6f5cabd5',
              classification: 'TYPE',
              displayName: 'Guru-Fil',
              
              resourcePath: 'MSVA/GURU_FILE',
              resourceName: 'GURU_FILE',
              labels: [],
            },
            {
              id: '406e08cc-c515-45e3-bd12-128094d80159',
              classification: 'TYPE',
              displayName: 'Önskar kontakt',
              
              resourcePath: 'MSVA/CONTACT_WANTED',
              resourceName: 'CONTACT_WANTED',
              labels: [],
            },
            {
              id: 'b0cf1d80-c301-41f5-9b9a-f6503c8a6e19',
              classification: 'TYPE',
              displayName: 'Extra utbetalning',
              
              resourcePath: 'MSVA/EXTRA_DISBURSEMENT',
              resourceName: 'EXTRA_DISBURSEMENT',
              labels: [],
            },
            {
              id: 'be54d3de-efc6-4823-810a-1a357554f212',
              classification: 'TYPE',
              displayName: 'Okategoriserat',
              
              resourcePath: 'MSVA/UNCATEGORIZED',
              resourceName: 'UNCATEGORIZED',
              labels: [],
            },
            {
              id: 'c7833f38-2459-4db8-8bfd-4dc6f8a8352c',
              classification: 'TYPE',
              displayName: 'Frånvaro',
              
              resourcePath: 'MSVA/ABSENCE',
              resourceName: 'ABSENCE',
              labels: [
                {
                  id: '21070c79-6b65-4540-a6f1-1601071258d9',
                  classification: 'SUBTYPE',
                  displayName: 'Semester',
                  
                  resourcePath: 'MSVA/ABSENCE/VACATION',
                  resourceName: 'VACATION',
                  labels: [],
                },
                {
                  id: '42844fbe-0ecb-4e83-b97e-f2eaab5d9378',
                  classification: 'SUBTYPE',
                  displayName: 'Föräldrarledighet',
                  
                  resourcePath: 'MSVA/ABSENCE/PARENTAL_LEAVE',
                  resourceName: 'PARENTAL_LEAVE',
                  labels: [],
                },
                {
                  id: '83c2eaf4-f335-4f57-9021-bc32a33b7c6b',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstledighet',
                  
                  resourcePath: 'MSVA/ABSENCE/LEAVE_OF_ABSENCE',
                  resourceName: 'LEAVE_OF_ABSENCE',
                  labels: [],
                },
                {
                  id: 'e18c13f7-5580-40dc-8964-e7731f78c092',
                  classification: 'SUBTYPE',
                  displayName: 'Sjukfrånvaro',
                  
                  resourcePath: 'MSVA/ABSENCE/SICKNESS_ABSENCE',
                  resourceName: 'SICKNESS_ABSENCE',
                  labels: [],
                },
              ],
            },
            {
              id: 'd15da281-b161-4fa4-bf88-96084c5f0fdf',
              classification: 'TYPE',
              displayName: 'Övrigt',
              
              resourcePath: 'MSVA/OTHER',
              resourceName: 'OTHER',
              labels: [
                {
                  id: '0a24492f-b114-4cd4-a488-2549ee6c7018',
                  classification: 'SUBTYPE',
                  displayName: 'Utlägg',
                  
                  resourcePath: 'MSVA/OTHER/EXPENSE',
                  resourceName: 'EXPENSE',
                  labels: [],
                },
                {
                  id: '0cf0a9a5-d12e-4360-ad3f-a53fc717f020',
                  classification: 'SUBTYPE',
                  displayName: 'Listor',
                  
                  resourcePath: 'MSVA/OTHER/LISTS',
                  resourceName: 'LISTS',
                  labels: [],
                },
                {
                  id: '95bf3e90-5500-4aa1-a90c-588fdb8a124a',
                  classification: 'SUBTYPE',
                  displayName: 'Omkontering',
                  
                  resourcePath: 'MSVA/OTHER/RE_ACCOUNTING',
                  resourceName: 'RE_ACCOUNTING',
                  labels: [],
                },
                {
                  id: '978515fc-e54c-4ecc-8369-8d22e8ae406f',
                  classification: 'SUBTYPE',
                  displayName: 'Blandat',
                  
                  resourcePath: 'MSVA/OTHER/MIXED',
                  resourceName: 'MIXED',
                  labels: [],
                },
                {
                  id: 'f42c880b-3ece-48d5-9309-9811e1839384',
                  classification: 'SUBTYPE',
                  displayName: 'Lönefrågor',
                  
                  resourcePath: 'MSVA/OTHER/SALARY_QUERY',
                  resourceName: 'SALARY_QUERY',
                  labels: [],
                },
              ],
            },
            {
              id: 'd4a51758-6f51-422b-87d3-5f292d3483a3',
              classification: 'TYPE',
              displayName: 'Schema',
              
              resourcePath: 'MSVA/SCHEDULE',
              resourceName: 'SCHEDULE',
              labels: [],
            },
            {
              id: 'd77d3d08-058d-4101-b1c9-7ca79f5e160b',
              classification: 'TYPE',
              displayName: 'Myndighetspost',
              
              resourcePath: 'MSVA/AUTHORITY_LETTER',
              resourceName: 'AUTHORITY_LETTER',
              labels: [
                {
                  id: '48a7dae4-c729-4d0d-8268-f769aa9af9b2',
                  classification: 'SUBTYPE',
                  displayName: 'Intyg',
                  
                  resourcePath: 'MSVA/AUTHORITY_LETTER/CERTIFICATE',
                  resourceName: 'CERTIFICATE',
                  labels: [],
                },
                {
                  id: 'ae9d9966-b9cd-49a2-b05d-d7ac8616babb',
                  classification: 'SUBTYPE',
                  displayName: 'Kronofogden',
                  
                  resourcePath: 'MSVA/AUTHORITY_LETTER/CROWN_BAILIFF',
                  resourceName: 'CROWN_BAILIFF',
                  labels: [],
                },
                {
                  id: 'd8d9007c-28f3-48a0-836c-c1ecdd49b896',
                  classification: 'SUBTYPE',
                  displayName: 'Försäkringskassan',
                  
                  resourcePath: 'MSVA/AUTHORITY_LETTER/SSIA',
                  resourceName: 'SSIA',
                  labels: [],
                },
              ],
            },
            {
              id: 'f8711989-328b-4703-a841-163c35cc7c5f',
              classification: 'TYPE',
              displayName: 'Politiker',
              
              resourcePath: 'MSVA/POLITICIAN',
              resourceName: 'POLITICIAN',
              labels: [
                {
                  id: '67ffb14d-c521-44d6-9c13-15acabef25ab',
                  classification: 'SUBTYPE',
                  displayName: 'Intyg',
                  
                  resourcePath: 'MSVA/POLITICIAN/CERTIFICATE',
                  resourceName: 'CERTIFICATE',
                  labels: [],
                },
                {
                  id: 'b3d5aedc-5415-487a-9239-316c5c6fe1d1',
                  classification: 'SUBTYPE',
                  displayName: 'Närvarolistor',
                  
                  resourcePath: 'MSVA/POLITICIAN/ATTENDANCE_LIST',
                  resourceName: 'ATTENDANCE_LIST',
                  labels: [],
                },
              ],
            },
          ],
        },
        {
          id: '41335d5a-726b-4ece-9439-734a3d9a8c6a',
          classification: 'CATEGORY',
          displayName: 'Systemförvaltning',
          
          resourcePath: 'SYSTEM_MANAGEMENT',
          resourceName: 'SYSTEM_MANAGEMENT',
          labels: [
            {
              id: '0de80be1-8023-4b71-9341-4f4f41077f48',
              classification: 'TYPE',
              displayName: 'ADATO',
              
              resourcePath: 'SYSTEM_MANAGEMENT/ADATO',
              resourceName: 'ADATO',
              labels: [],
            },
            {
              id: '165936ba-57b2-4dc2-983a-f159f1f7fb13',
              classification: 'TYPE',
              displayName: 'Adato/stella',
              
              resourcePath: 'SYSTEM_MANAGEMENT/ADATO_STELLA',
              resourceName: 'ADATO_STELLA',
              labels: [],
            },
            {
              id: '17cc8bbf-7893-4a58-a8cd-74e7ce3ef681',
              classification: 'TYPE',
              displayName: 'Organisationsförändringar',
              
              resourcePath: 'SYSTEM_MANAGEMENT/ORGANIZATION_TRANSFORMATION',
              resourceName: 'ORGANIZATION_TRANSFORMATION',
              labels: [],
            },
            {
              id: '32b3a938-8868-4aba-b54b-4b3517191549',
              classification: 'TYPE',
              displayName: 'Interna ärenden',
              
              resourcePath: 'SYSTEM_MANAGEMENT/INTERNAL',
              resourceName: 'INTERNAL',
              labels: [],
            },
            {
              id: '339a48dc-acd1-4f6c-bb3b-942d54267500',
              classification: 'TYPE',
              displayName: 'Grunddata',
              
              resourcePath: 'SYSTEM_MANAGEMENT/BASIC_DATA',
              resourceName: 'BASIC_DATA',
              labels: [],
            },
            {
              id: '339dc16b-f8b2-4bc6-8aa8-3c39c9cb1b40',
              classification: 'TYPE',
              displayName: 'Novi',
              
              resourcePath: 'SYSTEM_MANAGEMENT/NOVI',
              resourceName: 'NOVI',
              labels: [],
            },
            {
              id: '3ca1ad82-7b4b-4706-b6b6-00dd199208da',
              classification: 'TYPE',
              displayName: 'Visma recruit',
              
              resourcePath: 'SYSTEM_MANAGEMENT/VISMA_RECRUIT',
              resourceName: 'VISMA_RECRUIT',
              labels: [],
            },
            {
              id: '3d9e4867-3865-4cca-b399-d08effe3e2bc',
              classification: 'TYPE',
              displayName: 'Wärna/tolken',
              
              resourcePath: 'SYSTEM_MANAGEMENT/WARNA_TOLKEN',
              resourceName: 'WARNA_TOLKEN',
              labels: [],
            },
            {
              id: '6927d5ce-4634-4760-a987-f010125c93dc',
              classification: 'TYPE',
              displayName: 'Övrigt',
              
              resourcePath: 'SYSTEM_MANAGEMENT/OTHER',
              resourceName: 'OTHER',
              labels: [],
            },
            {
              id: '92786028-2cdf-4863-969e-185f82368f44',
              classification: 'TYPE',
              displayName: 'Lön och arbetstid',
              
              resourcePath: 'SYSTEM_MANAGEMENT/SALARY_AND_WORKING_HOURS',
              resourceName: 'SALARY_AND_WORKING_HOURS',
              labels: [],
            },
            {
              id: '9518b0e1-fda4-4c93-a282-c1736f3061a4',
              classification: 'TYPE',
              displayName: 'WinLas',
              
              resourcePath: 'SYSTEM_MANAGEMENT/WINLAS',
              resourceName: 'WINLAS',
              labels: [],
            },
            {
              id: 'c25fb0eb-813e-4ec3-bce7-916f8c4416fa',
              classification: 'TYPE',
              displayName: 'Stella',
              
              resourcePath: 'SYSTEM_MANAGEMENT/STELLA',
              resourceName: 'STELLA',
              labels: [],
            },
            {
              id: 'cc5a6c17-0025-4e71-aa17-3bfb9de9d770',
              classification: 'TYPE',
              displayName: 'Löneöversyn',
              
              resourcePath: 'SYSTEM_MANAGEMENT/WAGE_REVISION',
              resourceName: 'WAGE_REVISION',
              labels: [],
            },
            {
              id: 'cc7fdac8-c456-4c0c-9cd0-d47ce595f9d0',
              classification: 'TYPE',
              displayName: 'AGDI/Ekonomi',
              
              resourcePath: 'SYSTEM_MANAGEMENT/AGDI',
              resourceName: 'AGDI',
              labels: [],
            },
            {
              id: 'cfab387c-515a-4d3c-be83-2e6fff623777',
              classification: 'TYPE',
              displayName: 'Behörigheter',
              
              resourcePath: 'SYSTEM_MANAGEMENT/PERMISSIONS',
              resourceName: 'PERMISSIONS',
              labels: [],
            },
            {
              id: 'fb570c1e-1072-4ef2-a9bd-693e18015e2d',
              classification: 'TYPE',
              displayName: 'RPA/e-tjänster',
              
              resourcePath: 'SYSTEM_MANAGEMENT/RPA_AND_E_SERVICES',
              resourceName: 'RPA_AND_E_SERVICES',
              labels: [],
            },
            {
              id: 'fc95c31a-91dc-4f4b-b77e-fb0268dbb994',
              classification: 'TYPE',
              displayName: 'Kom o Gå',
              
              resourcePath: 'SYSTEM_MANAGEMENT/COME_AND_GO',
              resourceName: 'COME_AND_GO',
              labels: [],
            },
            {
              id: 'ffc658ec-3437-41df-89cb-574ee0b62f26',
              classification: 'TYPE',
              displayName: 'Okategoriserat',
              
              resourcePath: 'SYSTEM_MANAGEMENT/UNCATEGORIZED',
              resourceName: 'UNCATEGORIZED',
              labels: [
                {
                  id: '13565a63-d7da-41d2-aa8d-88cc7b1d7cca',
                  classification: 'SUBTYPE',
                  displayName: 'Okategoriserat',
                  
                  resourcePath: 'SYSTEM_MANAGEMENT/UNCATEGORIZED/UNCATEGORIZED',
                  resourceName: 'UNCATEGORIZED',
                  labels: [],
                },
              ],
            },
          ],
        },
        {
          id: '46787ee7-ff24-49d0-b93d-aa7da1ac55a0',
          classification: 'CATEGORY',
          displayName: 'Räddningstjänsten',
          
          resourcePath: 'RESCUE_SERVICE',
          resourceName: 'RESCUE_SERVICE',
          labels: [
            {
              id: '26d38e0b-4303-4d64-b5d0-bbeee1446937',
              classification: 'TYPE',
              displayName: 'Myndighetspost',
              
              resourcePath: 'RESCUE_SERVICE/AUTHORITY_LETTER',
              resourceName: 'AUTHORITY_LETTER',
              labels: [
                {
                  id: '168c4ab5-ae1d-486b-8fef-81406b0690b6',
                  classification: 'SUBTYPE',
                  displayName: 'Intyg',
                  
                  resourcePath: 'RESCUE_SERVICE/AUTHORITY_LETTER/CERTIFICATE',
                  resourceName: 'CERTIFICATE',
                  labels: [],
                },
                {
                  id: '17cbec28-860e-4e38-a6d3-1b82721d6cce',
                  classification: 'SUBTYPE',
                  displayName: 'Afa',
                  
                  resourcePath: 'RESCUE_SERVICE/AUTHORITY_LETTER/AFA',
                  resourceName: 'AFA',
                  labels: [],
                },
                {
                  id: '8ae8e997-7822-4266-893a-53ef5c9fedbf',
                  classification: 'SUBTYPE',
                  displayName: 'Kronofogden',
                  
                  resourcePath: 'RESCUE_SERVICE/AUTHORITY_LETTER/CROWN_BAILIFF',
                  resourceName: 'CROWN_BAILIFF',
                  labels: [],
                },
                {
                  id: 'c718ead3-6c62-4552-8b2c-210f092676a3',
                  classification: 'SUBTYPE',
                  displayName: 'Försäkringskassan',
                  
                  resourcePath: 'RESCUE_SERVICE/AUTHORITY_LETTER/SSIA',
                  resourceName: 'SSIA',
                  labels: [],
                },
              ],
            },
            {
              id: '2d686fe3-1b1d-4af7-92e7-943199d1bd56',
              classification: 'TYPE',
              displayName: 'Önskar kontakt',
              
              resourcePath: 'RESCUE_SERVICE/CONTACT_WANTED',
              resourceName: 'CONTACT_WANTED',
              labels: [],
            },
            {
              id: '4cd7e3f2-302b-47ee-88df-1f651736d710',
              classification: 'TYPE',
              displayName: 'Anställning',
              
              resourcePath: 'RESCUE_SERVICE/EMPLOYMENT',
              resourceName: 'EMPLOYMENT',
              labels: [
                {
                  id: '05edcd3e-4a57-405f-b26b-25f50d5bda10',
                  classification: 'SUBTYPE',
                  displayName: 'Nyanställning',
                  
                  resourcePath: 'RESCUE_SERVICE/EMPLOYMENT/NEW_EMPLOYMENT',
                  resourceName: 'NEW_EMPLOYMENT',
                  labels: [],
                },
                {
                  id: '37fe9892-dde9-48a2-8566-2682b4790278',
                  classification: 'SUBTYPE',
                  displayName: 'Verksamhetsförändring',
                  
                  resourcePath: 'RESCUE_SERVICE/EMPLOYMENT/ORGANIZATION_TRANSFORMATION',
                  resourceName: 'ORGANIZATION_TRANSFORMATION',
                  labels: [],
                },
                {
                  id: '5c02d514-7b2e-4209-96f8-5757d1f920cd',
                  classification: 'SUBTYPE',
                  displayName: 'Avslut',
                  
                  resourcePath: 'RESCUE_SERVICE/EMPLOYMENT/TERMINATION_OF_EMPLOYMENT',
                  resourceName: 'TERMINATION_OF_EMPLOYMENT',
                  labels: [],
                },
              ],
            },
            {
              id: '659de74c-a6ae-4b47-baf1-ff41edb4b174',
              classification: 'TYPE',
              displayName: 'Schema',
              
              resourcePath: 'RESCUE_SERVICE/SCHEDULE',
              resourceName: 'SCHEDULE',
              labels: [
                {
                  id: 'a1f64f7f-a4ad-4f76-9da5-7796b01bfd4e',
                  classification: 'SUBTYPE',
                  displayName: 'Scheman',
                  
                  resourcePath: 'RESCUE_SERVICE/SCHEDULE/SCHEDULE',
                  resourceName: 'SCHEDULE',
                  labels: [],
                },
                {
                  id: 'e07d17d7-fe39-46ea-9712-9e787369dd55',
                  classification: 'SUBTYPE',
                  displayName: 'Arbetsförändring',
                  
                  resourcePath: 'RESCUE_SERVICE/SCHEDULE/JOB_CHANGE',
                  resourceName: 'JOB_CHANGE',
                  labels: [],
                },
              ],
            },
            {
              id: '912d8313-104e-412a-906a-4e9dfd6989ea',
              classification: 'TYPE',
              displayName: 'Extra utbetalning',
              
              resourcePath: 'RESCUE_SERVICE/EXTRA_DISBURSEMENT',
              resourceName: 'EXTRA_DISBURSEMENT',
              labels: [
                {
                  id: '24cb9bfa-abc2-4b29-ab68-acf97212aae4',
                  classification: 'SUBTYPE',
                  displayName: 'Pengar åter',
                  
                  resourcePath: 'RESCUE_SERVICE/EXTRA_DISBURSEMENT/REFUND',
                  resourceName: 'REFUND',
                  labels: [],
                },
                {
                  id: '423789c0-bede-4fcc-b709-396fb3f15dff',
                  classification: 'SUBTYPE',
                  displayName: 'Nordea',
                  
                  resourcePath: 'RESCUE_SERVICE/EXTRA_DISBURSEMENT/NORDEA',
                  resourceName: 'NORDEA',
                  labels: [],
                },
                {
                  id: '7ce92492-81a3-48cf-8d3f-9a63f8d0c78e',
                  classification: 'SUBTYPE',
                  displayName: 'Snabbfax',
                  
                  resourcePath: 'RESCUE_SERVICE/EXTRA_DISBURSEMENT/FAX_MACHINE',
                  resourceName: 'FAX_MACHINE',
                  labels: [],
                },
              ],
            },
            {
              id: 'bcb2521e-6004-4016-aaf9-154fd0a85496',
              classification: 'TYPE',
              displayName: 'Övrigt',
              
              resourcePath: 'RESCUE_SERVICE/OTHER',
              resourceName: 'OTHER',
              labels: [
                {
                  id: '3badd331-0fef-47eb-b60b-d76d527240aa',
                  classification: 'SUBTYPE',
                  displayName: 'Omkontering',
                  
                  resourcePath: 'RESCUE_SERVICE/OTHER/RE_ACCOUNTING',
                  resourceName: 'RE_ACCOUNTING',
                  labels: [],
                },
                {
                  id: '8a852dbb-5e09-419d-a9b6-5b077e9de898',
                  classification: 'SUBTYPE',
                  displayName: 'Listor',
                  
                  resourcePath: 'RESCUE_SERVICE/OTHER/LISTS',
                  resourceName: 'LISTS',
                  labels: [],
                },
                {
                  id: 'aea2610f-80e6-4865-9c1e-e6ceaa7f8371',
                  classification: 'SUBTYPE',
                  displayName: 'Blandat',
                  
                  resourcePath: 'RESCUE_SERVICE/OTHER/MIXED',
                  resourceName: 'MIXED',
                  labels: [],
                },
              ],
            },
            {
              id: 'ce0994ef-6904-4a99-a5bb-97a1c138786d',
              classification: 'TYPE',
              displayName: 'Timvikarie',
              
              resourcePath: 'RESCUE_SERVICE/HOURLY_SUBSTITUTE',
              resourceName: 'HOURLY_SUBSTITUTE',
              labels: [
                {
                  id: '06b671e0-d9b5-442e-96a0-07c2bc7b49eb',
                  classification: 'SUBTYPE',
                  displayName: 'Kontaktperson',
                  
                  resourcePath: 'RESCUE_SERVICE/HOURLY_SUBSTITUTE/CONTACT_PERSON',
                  resourceName: 'CONTACT_PERSON',
                  labels: [],
                },
                {
                  id: '2820d578-f34f-49fa-be39-b4fce1bf0d61',
                  classification: 'SUBTYPE',
                  displayName: 'Ferieungdomar',
                  
                  resourcePath: 'RESCUE_SERVICE/HOURLY_SUBSTITUTE/VACATION_YOUTHS',
                  resourceName: 'VACATION_YOUTHS',
                  labels: [],
                },
                {
                  id: '3af56134-7d0d-4955-a37a-7dd276a7504f',
                  classification: 'SUBTYPE',
                  displayName: 'Timanställning',
                  
                  resourcePath: 'RESCUE_SERVICE/HOURLY_SUBSTITUTE/HOURLY_EMPLOYED',
                  resourceName: 'HOURLY_EMPLOYED',
                  labels: [],
                },
                {
                  id: '48909dce-39b4-4d97-adf5-b9a6e8c5f1dd',
                  classification: 'SUBTYPE',
                  displayName: 'Ledsagare',
                  
                  resourcePath: 'RESCUE_SERVICE/HOURLY_SUBSTITUTE/COMPANION',
                  resourceName: 'COMPANION',
                  labels: [],
                },
                {
                  id: '660b9990-0d02-4bd7-8916-2853b5a7586c',
                  classification: 'SUBTYPE',
                  displayName: 'Anhörigvårdare',
                  
                  resourcePath: 'RESCUE_SERVICE/HOURLY_SUBSTITUTE/RELATIVE_CAREGIVER',
                  resourceName: 'RELATIVE_CAREGIVER',
                  labels: [],
                },
                {
                  id: 'eb4d376e-2fe5-4653-acda-7a4c8c7a5e6b',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstgöringsrapport',
                  
                  resourcePath: 'RESCUE_SERVICE/HOURLY_SUBSTITUTE/DUTY_REPORT',
                  resourceName: 'DUTY_REPORT',
                  labels: [],
                },
              ],
            },
            {
              id: 'd0be1a72-ae23-428c-81d8-0b5d15d61339',
              classification: 'TYPE',
              displayName: 'Okategoriserat',
              
              resourcePath: 'RESCUE_SERVICE/UNCATEGORIZED',
              resourceName: 'UNCATEGORIZED',
              labels: [
                {
                  id: '5eb8fc59-d6f1-4770-861b-61a7ff9a8e1a',
                  classification: 'SUBTYPE',
                  displayName: 'Okategoriserat',
                  
                  resourcePath: 'RESCUE_SERVICE/UNCATEGORIZED/UNCATEGORIZED',
                  resourceName: 'UNCATEGORIZED',
                  labels: [],
                },
              ],
            },
            {
              id: 'f0f86da9-918d-46a9-974c-a72342c8856c',
              classification: 'TYPE',
              displayName: 'Deltidsbrandmän',
              
              resourcePath: 'RESCUE_SERVICE/PART_TIME_FIREFIGHTERS',
              resourceName: 'PART_TIME_FIREFIGHTERS',
              labels: [],
            },
            {
              id: 'f96a8c08-9765-4969-9c7b-5e45c54a05bb',
              classification: 'TYPE',
              displayName: 'Politiker',
              
              resourcePath: 'RESCUE_SERVICE/POLITICIAN',
              resourceName: 'POLITICIAN',
              labels: [
                {
                  id: 'b427314a-795e-40f3-890a-7ec3bd59f114',
                  classification: 'SUBTYPE',
                  displayName: 'Beslutsexpediering',
                  
                  resourcePath: 'RESCUE_SERVICE/POLITICIAN/DECISION_DISPATCH',
                  resourceName: 'DECISION_DISPATCH',
                  labels: [],
                },
                {
                  id: 'c22e9604-97f5-4ef3-b49b-f680c6452901',
                  classification: 'SUBTYPE',
                  displayName: 'Intyg',
                  
                  resourcePath: 'RESCUE_SERVICE/POLITICIAN/CERTIFICATE',
                  resourceName: 'CERTIFICATE',
                  labels: [],
                },
                {
                  id: 'fdbeb7d2-0641-4850-8b0d-6c178950a49f',
                  classification: 'SUBTYPE',
                  displayName: 'Närvarolistor',
                  
                  resourcePath: 'RESCUE_SERVICE/POLITICIAN/ATTENDANCE_LIST',
                  resourceName: 'ATTENDANCE_LIST',
                  labels: [],
                },
              ],
            },
            {
              id: 'feda0777-51ef-48ec-9d6e-2bfd13a6ceea',
              classification: 'TYPE',
              displayName: 'Frånvaro',
              
              resourcePath: 'RESCUE_SERVICE/ABSENCE',
              resourceName: 'ABSENCE',
              labels: [
                {
                  id: '04d5ff1f-ad85-4850-9c51-ad0c03fb72a3',
                  classification: 'SUBTYPE',
                  displayName: 'Semester',
                  
                  resourcePath: 'RESCUE_SERVICE/ABSENCE/VACATION',
                  resourceName: 'VACATION',
                  labels: [],
                },
                {
                  id: '47e2b043-79ad-4443-84e8-9f729b2954a8',
                  classification: 'SUBTYPE',
                  displayName: 'Föräldrarledighet',
                  
                  resourcePath: 'RESCUE_SERVICE/ABSENCE/PARENTAL_LEAVE',
                  resourceName: 'PARENTAL_LEAVE',
                  labels: [],
                },
                {
                  id: '86783972-a8df-4c69-9bc8-fde22c553b99',
                  classification: 'SUBTYPE',
                  displayName: 'Sjukfrånvaro',
                  
                  resourcePath: 'RESCUE_SERVICE/ABSENCE/SICKNESS_ABSENCE',
                  resourceName: 'SICKNESS_ABSENCE',
                  labels: [],
                },
                {
                  id: 'df522ec8-4946-4faf-ac9e-0bfc7880998f',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstledighet',
                  
                  resourcePath: 'RESCUE_SERVICE/ABSENCE/LEAVE_OF_ABSENCE',
                  resourceName: 'LEAVE_OF_ABSENCE',
                  labels: [],
                },
              ],
            },
          ],
        },
        {
          id: '82e62742-b06b-43ba-92e4-118e9b184ecb',
          classification: 'CATEGORY',
          displayName: 'Övriga bolag',
          
          resourcePath: 'OTHER_COMPANIES',
          resourceName: 'OTHER_COMPANIES',
          labels: [
            {
              id: '07048769-9b10-4a63-86b3-cc77670bf545',
              classification: 'TYPE',
              displayName: 'Anställning',
              
              resourcePath: 'OTHER_COMPANIES/EMPLOYMENT',
              resourceName: 'EMPLOYMENT',
              labels: [
                {
                  id: '1654c29d-b5ed-4c2e-8d63-c8dd660abe11',
                  classification: 'SUBTYPE',
                  displayName: 'Nyanställning',
                  
                  resourcePath: 'OTHER_COMPANIES/EMPLOYMENT/NEW_EMPLOYMENT',
                  resourceName: 'NEW_EMPLOYMENT',
                  labels: [],
                },
                {
                  id: '200fa128-d039-4ee2-b173-643aa004a149',
                  classification: 'SUBTYPE',
                  displayName: 'Anställning',
                  
                  resourcePath: 'OTHER_COMPANIES/EMPLOYMENT/EMPLOYMENT',
                  resourceName: 'EMPLOYMENT',
                  labels: [],
                },
                {
                  id: '6d843c29-a7d1-4968-91bc-5e698417fa8d',
                  classification: 'SUBTYPE',
                  displayName: 'Verksamhetsförändring',
                  
                  resourcePath: 'OTHER_COMPANIES/EMPLOYMENT/ORGANIZATION_TRANSFORMATION',
                  resourceName: 'ORGANIZATION_TRANSFORMATION',
                  labels: [],
                },
                {
                  id: '9c3ddfdb-7d6c-4aec-b9e0-daf42d5a5e35',
                  classification: 'SUBTYPE',
                  displayName: 'Avslut',
                  
                  resourcePath: 'OTHER_COMPANIES/EMPLOYMENT/TERMINATION_OF_EMPLOYMENT',
                  resourceName: 'TERMINATION_OF_EMPLOYMENT',
                  labels: [],
                },
              ],
            },
            {
              id: '2d224b22-d653-44f1-8e26-f9bcd86148e2',
              classification: 'TYPE',
              displayName: 'Timvikarie',
              
              resourcePath: 'OTHER_COMPANIES/HOURLY_SUBSTITUTE',
              resourceName: 'HOURLY_SUBSTITUTE',
              labels: [
                {
                  id: '60b37cd7-f3b8-4a15-b8f0-e683f752339f',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstgöringsrapport',
                  
                  resourcePath: 'OTHER_COMPANIES/HOURLY_SUBSTITUTE/DUTY_REPORT',
                  resourceName: 'DUTY_REPORT',
                  labels: [],
                },
                {
                  id: 'fb138168-8e6b-471d-8f9d-0bd994082cf7',
                  classification: 'SUBTYPE',
                  displayName: 'Timanställning',
                  
                  resourcePath: 'OTHER_COMPANIES/HOURLY_SUBSTITUTE/HOURLY_EMPLOYED',
                  resourceName: 'HOURLY_EMPLOYED',
                  labels: [],
                },
              ],
            },
            {
              id: '583a0740-cc62-43e3-81a2-c2a103e5e6b4',
              classification: 'TYPE',
              displayName: 'Företräde',
              
              resourcePath: 'OTHER_COMPANIES/PRECEDENCE',
              resourceName: 'PRECEDENCE',
              labels: [],
            },
            {
              id: '9d99d922-eb50-4593-b4c0-d53715c9fe11',
              classification: 'TYPE',
              displayName: 'Okategoriserat',
              
              resourcePath: 'OTHER_COMPANIES/UNCATEGORIZED',
              resourceName: 'UNCATEGORIZED',
              labels: [
                {
                  id: '7d9de458-7906-47d6-9e63-a63f55e0bc7b',
                  classification: 'SUBTYPE',
                  displayName: 'Okategoriserat',
                  
                  resourcePath: 'OTHER_COMPANIES/UNCATEGORIZED/UNCATEGORIZED',
                  resourceName: 'UNCATEGORIZED',
                  labels: [],
                },
              ],
            },
            {
              id: 'a81cec9e-37c2-4e11-b645-fd8d6aa7d05e',
              classification: 'TYPE',
              displayName: 'Frånvaro',
              
              resourcePath: 'OTHER_COMPANIES/ABSENCE',
              resourceName: 'ABSENCE',
              labels: [
                {
                  id: '466c3359-9ce0-4134-afa0-c5f162e6585d',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstledighet',
                  
                  resourcePath: 'OTHER_COMPANIES/ABSENCE/LEAVE_OF_ABSENCE',
                  resourceName: 'LEAVE_OF_ABSENCE',
                  labels: [],
                },
                {
                  id: '55d463ea-0341-4679-b258-2f81d93c87a3',
                  classification: 'SUBTYPE',
                  displayName: 'Föräldrarledighet',
                  
                  resourcePath: 'OTHER_COMPANIES/ABSENCE/PARENTAL_LEAVE',
                  resourceName: 'PARENTAL_LEAVE',
                  labels: [],
                },
                {
                  id: '64cc0e0d-37fa-4b8c-8e75-82aaeb18eb7b',
                  classification: 'SUBTYPE',
                  displayName: 'Sjukfrånvaro',
                  
                  resourcePath: 'OTHER_COMPANIES/ABSENCE/SICKNESS_ABSENCE',
                  resourceName: 'SICKNESS_ABSENCE',
                  labels: [],
                },
                {
                  id: 'ecdb1b0a-ce12-47f2-bda1-d2a46962b33e',
                  classification: 'SUBTYPE',
                  displayName: 'Semester',
                  
                  resourcePath: 'OTHER_COMPANIES/ABSENCE/VACATION',
                  resourceName: 'VACATION',
                  labels: [],
                },
              ],
            },
            {
              id: 'd0da2074-1f22-45c5-acc7-77db5739c4a7',
              classification: 'TYPE',
              displayName: 'Övrigt',
              
              resourcePath: 'OTHER_COMPANIES/OTHER',
              resourceName: 'OTHER',
              labels: [
                {
                  id: '19f8b063-6f93-4a9c-b4ea-0f27eb6a69a5',
                  classification: 'SUBTYPE',
                  displayName: 'Omkontering',
                  
                  resourcePath: 'OTHER_COMPANIES/OTHER/RE_ACCOUNTING',
                  resourceName: 'RE_ACCOUNTING',
                  labels: [],
                },
                {
                  id: '3b12f80a-983f-433e-9284-5c6f2e2b047b',
                  classification: 'SUBTYPE',
                  displayName: 'Lönefrågor',
                  
                  resourcePath: 'OTHER_COMPANIES/OTHER/SALARY_QUERY',
                  resourceName: 'SALARY_QUERY',
                  labels: [],
                },
                {
                  id: '786b6693-1582-4300-be91-17d4af7f88ca',
                  classification: 'SUBTYPE',
                  displayName: 'Listor',
                  
                  resourcePath: 'OTHER_COMPANIES/OTHER/LISTS',
                  resourceName: 'LISTS',
                  labels: [],
                },
                {
                  id: 'd6293241-3460-42fd-81ca-0fb4f09171cf',
                  classification: 'SUBTYPE',
                  displayName: 'Blandat',
                  
                  resourcePath: 'OTHER_COMPANIES/OTHER/MIXED',
                  resourceName: 'MIXED',
                  labels: [],
                },
              ],
            },
            {
              id: 'd15bd526-06d2-4b07-b8e9-64027e3c7686',
              classification: 'TYPE',
              displayName: 'Extra utbetalning',
              
              resourcePath: 'OTHER_COMPANIES/EXTRA_DISBURSEMENT',
              resourceName: 'EXTRA_DISBURSEMENT',
              labels: [],
            },
            {
              id: 'd7504d2e-c168-44d7-9f1e-c7248cd5af47',
              classification: 'TYPE',
              displayName: 'Önskar kontakt',
              
              resourcePath: 'OTHER_COMPANIES/CONTACT_WANTED',
              resourceName: 'CONTACT_WANTED',
              labels: [],
            },
            {
              id: 'dbada035-5353-406f-a6e6-4483d34e1dbe',
              classification: 'TYPE',
              displayName: 'Myndighetspost',
              
              resourcePath: 'OTHER_COMPANIES/AUTHORITY_LETTER',
              resourceName: 'AUTHORITY_LETTER',
              labels: [
                {
                  id: '3604d82a-3935-4f34-993b-a16b290a3095',
                  classification: 'SUBTYPE',
                  displayName: 'Intyg',
                  
                  resourcePath: 'OTHER_COMPANIES/AUTHORITY_LETTER/CERTIFICATE',
                  resourceName: 'CERTIFICATE',
                  labels: [],
                },
                {
                  id: 'b0893aaf-d021-401b-ba61-1d31e0ccb29b',
                  classification: 'SUBTYPE',
                  displayName: 'Försäkringskassan',
                  
                  resourcePath: 'OTHER_COMPANIES/AUTHORITY_LETTER/SSIA',
                  resourceName: 'SSIA',
                  labels: [],
                },
                {
                  id: 'bc861d5f-4750-47bd-9f29-b4364c198bea',
                  classification: 'SUBTYPE',
                  displayName: 'Kronofogden',
                  
                  resourcePath: 'OTHER_COMPANIES/AUTHORITY_LETTER/CROWN_BAILIFF',
                  resourceName: 'CROWN_BAILIFF',
                  labels: [],
                },
              ],
            },
            {
              id: 'f3e89f74-c686-43c4-94b5-f1043ab36bb8',
              classification: 'TYPE',
              displayName: 'Schema',
              
              resourcePath: 'OTHER_COMPANIES/SCHEDULE',
              resourceName: 'SCHEDULE',
              labels: [
                {
                  id: '86a27c8e-aaf2-4de5-9096-5ce77b806a2a',
                  classification: 'SUBTYPE',
                  displayName: 'Scheman',
                  
                  resourcePath: 'OTHER_COMPANIES/SCHEDULE/SCHEDULE',
                  resourceName: 'SCHEDULE',
                  labels: [],
                },
                {
                  id: '8aee1ffa-09b7-404c-a0b3-afaf1c654d09',
                  classification: 'SUBTYPE',
                  displayName: 'Arbetsförändring',
                  
                  resourcePath: 'OTHER_COMPANIES/SCHEDULE/JOB_CHANGE',
                  resourceName: 'JOB_CHANGE',
                  labels: [],
                },
              ],
            },
            {
              id: 'ff31c432-b39c-488d-a11d-67ea3254bcf6',
              classification: 'TYPE',
              displayName: 'Skulder',
              
              resourcePath: 'OTHER_COMPANIES/DEBTS',
              resourceName: 'DEBTS',
              labels: [
                {
                  id: '71a8bc4f-5c3f-472f-a5c4-80dbd18dd1f7',
                  classification: 'SUBTYPE',
                  displayName: 'Skulder',
                  
                  resourcePath: 'OTHER_COMPANIES/DEBTS/DEBTS',
                  resourceName: 'DEBTS',
                  labels: [],
                },
              ],
            },
          ],
        },
        {
          id: '9162a598-b644-4542-b91d-1a31eee5fca8',
          classification: 'CATEGORY',
          displayName: 'Nivå 1',
          
          resourcePath: 'ABC',
          resourceName: 'ABC',
          labels: [
            {
              id: '563047f9-f988-4e1a-8a8e-3009a2b5a0ce',
              classification: 'TYPE',
              displayName: 'Nivå 2',
              
              resourcePath: 'ABC/DEF',
              resourceName: 'DEF',
              labels: [
                {
                  id: 'd56ce10f-49b5-459d-bd40-a130cba76e63',
                  classification: 'SUBTYPE',
                  displayName: 'Nivå 3',
                  
                  resourcePath: 'ABC/DEF/GHI',
                  resourceName: 'GHI',
                  labels: [],
                },
              ],
            },
          ],
        },
        {
          id: 'aabe5e35-bb3b-4acf-a644-2e2042da229f',
          classification: 'CATEGORY',
          displayName: 'Sundsvall Energi',
          
          resourcePath: 'SEAB',
          resourceName: 'SEAB',
          labels: [
            {
              id: '09b08d5d-f1c3-4398-ae46-598532bf498a',
              classification: 'TYPE',
              displayName: 'Kom/Gå',
              
              resourcePath: 'SEAB/COME_GO',
              resourceName: 'COME_GO',
              labels: [],
            },
            {
              id: '11d98043-e429-4099-b339-88365a15548e',
              classification: 'TYPE',
              displayName: 'Övrigt',
              
              resourcePath: 'SEAB/OTHER',
              resourceName: 'OTHER',
              labels: [
                {
                  id: '5ffa1725-f7ef-4a56-9214-5188297e0ba4',
                  classification: 'SUBTYPE',
                  displayName: 'Omkontering',
                  
                  resourcePath: 'SEAB/OTHER/RE_ACCOUNTING',
                  resourceName: 'RE_ACCOUNTING',
                  labels: [],
                },
                {
                  id: '74c0f391-5b8d-41f1-ab70-54887098030f',
                  classification: 'SUBTYPE',
                  displayName: 'Listor',
                  
                  resourcePath: 'SEAB/OTHER/LISTS',
                  resourceName: 'LISTS',
                  labels: [],
                },
                {
                  id: '7b673131-93f9-4ad3-9b77-1db6f0d6e3f9',
                  classification: 'SUBTYPE',
                  displayName: 'Blandat',
                  
                  resourcePath: 'SEAB/OTHER/MIXED',
                  resourceName: 'MIXED',
                  labels: [],
                },
                {
                  id: 'cf21b8b3-cfe7-4955-af5a-023da3a464ab',
                  classification: 'SUBTYPE',
                  displayName: 'Lönefrågor',
                  
                  resourcePath: 'SEAB/OTHER/SALARY_QUERY',
                  resourceName: 'SALARY_QUERY',
                  labels: [],
                },
              ],
            },
            {
              id: '2194b8f6-261d-40e0-a529-a735bbf11b61',
              classification: 'TYPE',
              displayName: 'Myndighetspost',
              
              resourcePath: 'SEAB/AUTHORITY_LETTER',
              resourceName: 'AUTHORITY_LETTER',
              labels: [
                {
                  id: '25f3c98f-9b99-4981-ac70-69b9f031a02c',
                  classification: 'SUBTYPE',
                  displayName: 'Försäkringskassan',
                  
                  resourcePath: 'SEAB/AUTHORITY_LETTER/SSIA',
                  resourceName: 'SSIA',
                  labels: [],
                },
                {
                  id: '844f6bec-5cef-447f-be3e-64b7f1c2f763',
                  classification: 'SUBTYPE',
                  displayName: 'Intyg',
                  
                  resourcePath: 'SEAB/AUTHORITY_LETTER/CERTIFICATE',
                  resourceName: 'CERTIFICATE',
                  labels: [],
                },
                {
                  id: '99e40f94-d22a-487e-ac9e-f11ed036b729',
                  classification: 'SUBTYPE',
                  displayName: 'Kronofogden',
                  
                  resourcePath: 'SEAB/AUTHORITY_LETTER/CROWN_BAILIFF',
                  resourceName: 'CROWN_BAILIFF',
                  labels: [],
                },
              ],
            },
            {
              id: '53a4d98a-8d5f-440c-9837-771cc5e0fd55',
              classification: 'TYPE',
              displayName: 'Frånvaro',
              
              resourcePath: 'SEAB/ABSENCE',
              resourceName: 'ABSENCE',
              labels: [
                {
                  id: '313f1776-6aed-4a82-99ac-1b2f5672b888',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstledighet',
                  
                  resourcePath: 'SEAB/ABSENCE/LEAVE_OF_ABSENCE',
                  resourceName: 'LEAVE_OF_ABSENCE',
                  labels: [],
                },
                {
                  id: 'b796bbc9-b5ee-4711-afba-fca94ddba662',
                  classification: 'SUBTYPE',
                  displayName: 'Sjukfrånvaro',
                  
                  resourcePath: 'SEAB/ABSENCE/SICKNESS_ABSENCE',
                  resourceName: 'SICKNESS_ABSENCE',
                  labels: [],
                },
                {
                  id: 'edd6f841-fd61-4476-ac96-481cbebc92d6',
                  classification: 'SUBTYPE',
                  displayName: 'Föräldrarledighet',
                  
                  resourcePath: 'SEAB/ABSENCE/PARENTAL_LEAVE',
                  resourceName: 'PARENTAL_LEAVE',
                  labels: [],
                },
                {
                  id: 'f6002ce7-5925-4fc7-a2b8-e95266be9f6f',
                  classification: 'SUBTYPE',
                  displayName: 'Semester',
                  
                  resourcePath: 'SEAB/ABSENCE/VACATION',
                  resourceName: 'VACATION',
                  labels: [],
                },
              ],
            },
            {
              id: '5cf898fb-b18d-44fc-83a3-1bdf6c5b9e67',
              classification: 'TYPE',
              displayName: 'Schema',
              
              resourcePath: 'SEAB/SCHEDULE',
              resourceName: 'SCHEDULE',
              labels: [
                {
                  id: '460b2e14-d39d-4533-88b4-0147a9ddaa57',
                  classification: 'SUBTYPE',
                  displayName: 'Scheman',
                  
                  resourcePath: 'SEAB/SCHEDULE/SCHEDULE',
                  resourceName: 'SCHEDULE',
                  labels: [],
                },
                {
                  id: 'b40f38e0-1972-45b8-b553-e33d0fff7fc4',
                  classification: 'SUBTYPE',
                  displayName: 'Arbetsförändring',
                  
                  resourcePath: 'SEAB/SCHEDULE/JOB_CHANGE',
                  resourceName: 'JOB_CHANGE',
                  labels: [],
                },
                {
                  id: 'd8abfbcb-f5a6-4b09-9624-7ca79fa2de81',
                  classification: 'SUBTYPE',
                  displayName: 'Beredskap',
                  
                  resourcePath: 'SEAB/SCHEDULE/READINESS',
                  resourceName: 'READINESS',
                  labels: [],
                },
              ],
            },
            {
              id: '6d41629a-4089-4547-a873-2528e175e276',
              classification: 'TYPE',
              displayName: 'Önskar kontakt',
              
              resourcePath: 'SEAB/CONTACT_WANTED',
              resourceName: 'CONTACT_WANTED',
              labels: [],
            },
            {
              id: '93b278e4-56ef-4f0b-951e-95c7dd1ec816',
              classification: 'TYPE',
              displayName: 'Extra utbetalning',
              
              resourcePath: 'SEAB/EXTRA_DISBURSEMENT',
              resourceName: 'EXTRA_DISBURSEMENT',
              labels: [],
            },
            {
              id: 'b648f589-1e95-497f-a5a4-fba6575c9adf',
              classification: 'TYPE',
              displayName: 'Skulder',
              
              resourcePath: 'SEAB/DEBTS',
              resourceName: 'DEBTS',
              labels: [
                {
                  id: '8c1b873f-dce2-4c1d-9297-df423190d460',
                  classification: 'SUBTYPE',
                  displayName: 'Skulder',
                  
                  resourcePath: 'SEAB/DEBTS/DEBTS',
                  resourceName: 'DEBTS',
                  labels: [],
                },
              ],
            },
            {
              id: 'b9de47dd-4e03-49ee-97d5-df3e661e2174',
              classification: 'TYPE',
              displayName: 'Anställning',
              
              resourcePath: 'SEAB/EMPLOYMENT',
              resourceName: 'EMPLOYMENT',
              labels: [
                {
                  id: '14a1067a-f74b-4d57-8de1-b5c2982796c7',
                  classification: 'SUBTYPE',
                  displayName: 'Anställning',
                  
                  resourcePath: 'SEAB/EMPLOYMENT/EMPLOYMENT',
                  resourceName: 'EMPLOYMENT',
                  labels: [],
                },
                {
                  id: 'a252ba98-aaca-40a8-afc8-328c34ed6394',
                  classification: 'SUBTYPE',
                  displayName: 'Nyanställning',
                  
                  resourcePath: 'SEAB/EMPLOYMENT/NEW_EMPLOYMENT',
                  resourceName: 'NEW_EMPLOYMENT',
                  labels: [],
                },
                {
                  id: 'bdb146b2-9f3a-43b2-a353-d788d52d056c',
                  classification: 'SUBTYPE',
                  displayName: 'Avslut',
                  
                  resourcePath: 'SEAB/EMPLOYMENT/TERMINATION_OF_EMPLOYMENT',
                  resourceName: 'TERMINATION_OF_EMPLOYMENT',
                  labels: [],
                },
              ],
            },
            {
              id: 'dbb974d1-266a-4e73-8ed4-59979a838363',
              classification: 'TYPE',
              displayName: 'Timvikarie',
              
              resourcePath: 'SEAB/HOURLY_SUBSTITUTE',
              resourceName: 'HOURLY_SUBSTITUTE',
              labels: [
                {
                  id: '0775b6fa-ffb1-4ca9-888c-b824bdd73a1c',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstgöringsrapport',
                  
                  resourcePath: 'SEAB/HOURLY_SUBSTITUTE/DUTY_REPORT',
                  resourceName: 'DUTY_REPORT',
                  labels: [],
                },
                {
                  id: '7d5b7ada-6269-4a4e-b95e-f5840301c2bf',
                  classification: 'SUBTYPE',
                  displayName: 'Timanställning',
                  
                  resourcePath: 'SEAB/HOURLY_SUBSTITUTE/HOURLY_EMPLOYED',
                  resourceName: 'HOURLY_EMPLOYED',
                  labels: [],
                },
              ],
            },
            {
              id: 'f658bfa2-ee17-4904-9f5f-8ef647ccc427',
              classification: 'TYPE',
              displayName: 'Okategoriserat',
              
              resourcePath: 'SEAB/UNCATEGORIZED',
              resourceName: 'UNCATEGORIZED',
              labels: [],
            },
          ],
        },
        {
          id: 'c0829456-8b25-4014-91ea-d368be1691be',
          classification: 'CATEGORY',
          displayName: 'Elnät/Servanet',
          
          resourcePath: 'ELECTRICITY_SERVANET',
          resourceName: 'ELECTRICITY_SERVANET',
          labels: [
            {
              id: '13e4ed9a-3c9f-4e44-8521-1676735cf35d',
              classification: 'TYPE',
              displayName: 'Okategoriserat',
              
              resourcePath: 'ELECTRICITY_SERVANET/UNCATAGORIZED',
              resourceName: 'UNCATAGORIZED',
              labels: [],
            },
            {
              id: '18233dcd-7103-43e6-805e-547dffad1606',
              classification: 'TYPE',
              displayName: 'Guru-Fil',
              
              resourcePath: 'ELECTRICITY_SERVANET/GURU_FILE',
              resourceName: 'GURU_FILE',
              labels: [],
            },
            {
              id: '2f3fec6b-d5a6-4a4b-b6da-84036f248d7f',
              classification: 'TYPE',
              displayName: 'Anställning',
              
              resourcePath: 'ELECTRICITY_SERVANET/EMPLOYMENT',
              resourceName: 'EMPLOYMENT',
              labels: [
                {
                  id: '602f785c-7526-4040-96fc-e3c3f6dc242d',
                  classification: 'SUBTYPE',
                  displayName: 'Anställning',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/EMPLOYMENT/EMPLOYMENT',
                  resourceName: 'EMPLOYMENT',
                  labels: [],
                },
                {
                  id: '80154174-55cb-4d5d-be66-e349d99b66e4',
                  classification: 'SUBTYPE',
                  displayName: 'Avslut',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/EMPLOYMENT/TERMINATION_OF_EMPLOYMENT',
                  resourceName: 'TERMINATION_OF_EMPLOYMENT',
                  labels: [],
                },
                {
                  id: 'a28dbbd5-3359-40d5-a8e5-58faa93de163',
                  classification: 'SUBTYPE',
                  displayName: 'Nyanställning',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/EMPLOYMENT/NEW_EMPLOYMENT',
                  resourceName: 'NEW_EMPLOYMENT',
                  labels: [],
                },
              ],
            },
            {
              id: '45ce26b6-c1e2-42f1-84e3-810ce8512c8c',
              classification: 'TYPE',
              displayName: 'Schema',
              
              resourcePath: 'ELECTRICITY_SERVANET/SCHEDULE',
              resourceName: 'SCHEDULE',
              labels: [
                {
                  id: '577d7667-7efc-4bdd-8ce8-e1819d823467',
                  classification: 'SUBTYPE',
                  displayName: 'Scheman',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/SCHEDULE/SCHEDULE',
                  resourceName: 'SCHEDULE',
                  labels: [],
                },
                {
                  id: 'ffc937e4-0989-4ea8-b3cf-240e7c6427f4',
                  classification: 'SUBTYPE',
                  displayName: 'Arbetsförändring',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/SCHEDULE/JOB_CHANGE',
                  resourceName: 'JOB_CHANGE',
                  labels: [],
                },
              ],
            },
            {
              id: '624b8ef9-bccd-4e1e-87e4-9dc0a8b13f90',
              classification: 'TYPE',
              displayName: 'Frånvaro',
              
              resourcePath: 'ELECTRICITY_SERVANET/ABSENCE',
              resourceName: 'ABSENCE',
              labels: [
                {
                  id: '37659b2e-8f2f-415a-99d6-6d3d974dddd7',
                  classification: 'SUBTYPE',
                  displayName: 'Semester',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/ABSENCE/VACATION',
                  resourceName: 'VACATION',
                  labels: [],
                },
                {
                  id: 'b864b21a-240c-4684-aad3-57eb6b62a7d0',
                  classification: 'SUBTYPE',
                  displayName: 'Sjukfrånvaro',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/ABSENCE/SICKNESS_ABSENCE',
                  resourceName: 'SICKNESS_ABSENCE',
                  labels: [],
                },
                {
                  id: 'beba98e4-5b1d-4a17-ae26-40791d2da2a4',
                  classification: 'SUBTYPE',
                  displayName: 'Föräldrarledighet',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/ABSENCE/PARENTAL_LEAVE',
                  resourceName: 'PARENTAL_LEAVE',
                  labels: [],
                },
                {
                  id: 'da7b1760-5129-45df-b698-b044f10d9ae2',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstledighet',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/ABSENCE/LEAVE_OF_ABSENCE',
                  resourceName: 'LEAVE_OF_ABSENCE',
                  labels: [],
                },
              ],
            },
            {
              id: '75614c68-b74a-4c36-b493-db8c70e996d8',
              classification: 'TYPE',
              displayName: 'Önskar kontakt',
              
              resourcePath: 'ELECTRICITY_SERVANET/CONTACT_WANTED',
              resourceName: 'CONTACT_WANTED',
              labels: [],
            },
            {
              id: '7c9fe1af-5e10-41db-a714-87d72d6bd7eb',
              classification: 'TYPE',
              displayName: 'Extra utbetalning',
              
              resourcePath: 'ELECTRICITY_SERVANET/EXTRA_DISBURSEMENT',
              resourceName: 'EXTRA_DISBURSEMENT',
              labels: [],
            },
            {
              id: '7e136268-25d9-4e18-95e5-72e3e24e47b2',
              classification: 'TYPE',
              displayName: 'Övrigt',
              
              resourcePath: 'ELECTRICITY_SERVANET/OTHER',
              resourceName: 'OTHER',
              labels: [
                {
                  id: '3636f870-7b1a-427a-b519-27eaf2087d4f',
                  classification: 'SUBTYPE',
                  displayName: 'Utlägg',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/OTHER/OUTLAY',
                  resourceName: 'OUTLAY',
                  labels: [],
                },
                {
                  id: '41ed1d5d-1c9c-47a9-8dea-5f1db3f6565f',
                  classification: 'SUBTYPE',
                  displayName: 'Listor',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/OTHER/LISTS',
                  resourceName: 'LISTS',
                  labels: [],
                },
                {
                  id: '49d79af5-6887-4c47-890a-900e1747b23b',
                  classification: 'SUBTYPE',
                  displayName: 'Anställning',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/OTHER/EMPLOYMENT',
                  resourceName: 'EMPLOYMENT',
                  labels: [],
                },
                {
                  id: '8d7018df-3235-4e76-8bb8-c158f3b54646',
                  classification: 'SUBTYPE',
                  displayName: 'Blandat',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/OTHER/MIXED',
                  resourceName: 'MIXED',
                  labels: [],
                },
                {
                  id: '9f31a3f2-025c-4f9c-b038-54ca883b2a15',
                  classification: 'SUBTYPE',
                  displayName: 'Skulder',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/OTHER/DEBTS',
                  resourceName: 'DEBTS',
                  labels: [],
                },
                {
                  id: 'd07479de-a1f6-48ba-8220-42714887bb7b',
                  classification: 'SUBTYPE',
                  displayName: 'Lönefrågor',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/OTHER/SALARY_INQUIRY',
                  resourceName: 'SALARY_INQUIRY',
                  labels: [],
                },
              ],
            },
            {
              id: 'b1a5642b-2014-4d7b-99e1-4adbb034572e',
              classification: 'TYPE',
              displayName: 'Timvikarie',
              
              resourcePath: 'ELECTRICITY_SERVANET/HOURLY_SUBSTITUTE',
              resourceName: 'HOURLY_SUBSTITUTE',
              labels: [
                {
                  id: '4ec575e3-2c97-408a-b3fc-56fca859d54c',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstgöringsrapport',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/HOURLY_SUBSTITUTE/DUTY_REPORT',
                  resourceName: 'DUTY_REPORT',
                  labels: [],
                },
                {
                  id: '9057e261-90fd-43fe-a8f7-88deb68e5689',
                  classification: 'SUBTYPE',
                  displayName: 'Timanställning',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/HOURLY_SUBSTITUTE/HOURLY_EMPLOYED',
                  resourceName: 'HOURLY_EMPLOYED',
                  labels: [],
                },
              ],
            },
            {
              id: 'd81ca002-df53-42ad-a7c2-5133938298cf',
              classification: 'TYPE',
              displayName: 'Myndighetspost',
              
              resourcePath: 'ELECTRICITY_SERVANET/AUTHORITY_LETTER',
              resourceName: 'AUTHORITY_LETTER',
              labels: [
                {
                  id: '3782b020-30f2-4024-9e69-99fac75a1b35',
                  classification: 'SUBTYPE',
                  displayName: 'Försäkringskassan',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/AUTHORITY_LETTER/SSIA',
                  resourceName: 'SSIA',
                  labels: [],
                },
                {
                  id: '52d2b8e0-f04d-458e-a301-7a44071283a8',
                  classification: 'SUBTYPE',
                  displayName: 'Intyg',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/AUTHORITY_LETTER/CERTIFICATE',
                  resourceName: 'CERTIFICATE',
                  labels: [],
                },
                {
                  id: '71274d6b-78cc-4495-b98a-742b2918a2af',
                  classification: 'SUBTYPE',
                  displayName: 'Kronofogden',
                  
                  resourcePath: 'ELECTRICITY_SERVANET/AUTHORITY_LETTER/CROWN_BAILIFF',
                  resourceName: 'CROWN_BAILIFF',
                  labels: [],
                },
              ],
            },
          ],
        },
        {
          id: 'f45bbf83-180f-49f8-b0ae-600693747921',
          classification: 'CATEGORY',
          displayName: 'Lön',
          
          resourcePath: 'SALARY',
          resourceName: 'SALARY',
          labels: [
            {
              id: '05f68a17-510c-44b7-8cd1-3928ea61de24',
              classification: 'TYPE',
              displayName: 'Okategoriserat',
              
              resourcePath: 'SALARY/UNCATEGORIZED',
              resourceName: 'UNCATEGORIZED',
              labels: [
                {
                  id: 'a35688bf-acce-4f61-8d19-03ecc9a353c7',
                  classification: 'SUBTYPE',
                  displayName: 'Okategoriserat',
                  
                  resourcePath: 'SALARY/UNCATEGORIZED/UNCATEGORIZED',
                  resourceName: 'UNCATEGORIZED',
                  labels: [],
                },
              ],
            },
            {
              id: '147ca3eb-3401-4b41-92f0-919e3bdcb2f8',
              classification: 'TYPE',
              displayName: 'Timvikarie',
              
              resourcePath: 'SALARY/HOURLY_SUBSTITUTE',
              resourceName: 'HOURLY_SUBSTITUTE',
              labels: [
                {
                  id: '104e1b70-6145-41c8-aeb4-084387a9882a',
                  classification: 'SUBTYPE',
                  displayName: 'Ferieungdomar',
                  
                  resourcePath: 'SALARY/HOURLY_SUBSTITUTE/VACATION_YOUTHS',
                  resourceName: 'VACATION_YOUTHS',
                  labels: [],
                },
                {
                  id: '38d5ad16-2249-4600-94ae-90c615f8eff3',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstgöringsrapport',
                  
                  resourcePath: 'SALARY/HOURLY_SUBSTITUTE/DUTY_REPORT',
                  resourceName: 'DUTY_REPORT',
                  labels: [],
                },
                {
                  id: '4cf10039-f2e7-42d9-867e-3864acb263d5',
                  classification: 'SUBTYPE',
                  displayName: 'Kontaktperson',
                  
                  resourcePath: 'SALARY/HOURLY_SUBSTITUTE/CONTACT_PERSON',
                  resourceName: 'CONTACT_PERSON',
                  labels: [],
                },
                {
                  id: 'b3ba4533-cc8a-4436-9b40-c1ca0153543f',
                  classification: 'SUBTYPE',
                  displayName: 'Timanställning',
                  
                  resourcePath: 'SALARY/HOURLY_SUBSTITUTE/HOURLY_EMPLOYED',
                  resourceName: 'HOURLY_EMPLOYED',
                  labels: [],
                },
                {
                  id: 'c4b5f732-78dc-4fbd-9ef6-c69db8f8aa4b',
                  classification: 'SUBTYPE',
                  displayName: 'Anhörigvårdare',
                  
                  resourcePath: 'SALARY/HOURLY_SUBSTITUTE/RELATIVE_CAREGIVER',
                  resourceName: 'RELATIVE_CAREGIVER',
                  labels: [],
                },
                {
                  id: 'e7bdabea-3686-4b93-ba0f-523379f8e8df',
                  classification: 'SUBTYPE',
                  displayName: 'Ledsagare',
                  
                  resourcePath: 'SALARY/HOURLY_SUBSTITUTE/COMPANION',
                  resourceName: 'COMPANION',
                  labels: [],
                },
              ],
            },
            {
              id: '3262b758-0809-498f-8f59-f2289c9a4f39',
              classification: 'TYPE',
              displayName: 'Anställning',
              
              resourcePath: 'SALARY/EMPLOYMENT',
              resourceName: 'EMPLOYMENT',
              labels: [
                {
                  id: '37ed354b-372a-4159-89e0-00b7ee5c01aa',
                  classification: 'SUBTYPE',
                  displayName: 'Anställning',
                  
                  resourcePath: 'SALARY/EMPLOYMENT/EMPLOYMENT',
                  resourceName: 'EMPLOYMENT',
                  labels: [],
                },
                {
                  id: '4a637e32-e2c6-4b0f-a8be-af53fed093f6',
                  classification: 'SUBTYPE',
                  displayName: 'Nyanställning',
                  
                  resourcePath: 'SALARY/EMPLOYMENT/NEW_EMPLOYMENT',
                  resourceName: 'NEW_EMPLOYMENT',
                  labels: [],
                },
                {
                  id: '935fab3d-d11c-4116-b1ac-babc7f51bb6b',
                  classification: 'SUBTYPE',
                  displayName: 'Verksamhetsförändring',
                  
                  resourcePath: 'SALARY/EMPLOYMENT/ORGANIZATION_TRANSFORMATION',
                  resourceName: 'ORGANIZATION_TRANSFORMATION',
                  labels: [],
                },
                {
                  id: '93736902-44f9-4ed8-8701-160112a75b48',
                  classification: 'SUBTYPE',
                  displayName: 'Avslut',
                  
                  resourcePath: 'SALARY/EMPLOYMENT/TERMINATION_OF_EMPLOYMENT',
                  resourceName: 'TERMINATION_OF_EMPLOYMENT',
                  labels: [],
                },
              ],
            },
            {
              id: '3e200a1b-b3ae-4845-8504-012176624d00',
              classification: 'TYPE',
              displayName: 'Extra utbetalning',
              
              resourcePath: 'SALARY/EXTRA_DISBURSEMENT',
              resourceName: 'EXTRA_DISBURSEMENT',
              labels: [
                {
                  id: '295692d7-74bc-4b89-824f-359282313d98',
                  classification: 'SUBTYPE',
                  displayName: 'Nordea',
                  
                  resourcePath: 'SALARY/EXTRA_DISBURSEMENT/NORDEA',
                  resourceName: 'NORDEA',
                  labels: [],
                },
                {
                  id: '3b4de339-127f-4de8-95c1-3aee618ff18c',
                  classification: 'SUBTYPE',
                  displayName: 'Snabbfax',
                  
                  resourcePath: 'SALARY/EXTRA_DISBURSEMENT/FAX_MACHINE',
                  resourceName: 'FAX_MACHINE',
                  labels: [],
                },
                {
                  id: '831284d7-5e0e-4c2a-8d98-99da5b5d6e8e',
                  classification: 'SUBTYPE',
                  displayName: 'Pengar åter',
                  
                  resourcePath: 'SALARY/EXTRA_DISBURSEMENT/REFUND',
                  resourceName: 'REFUND',
                  labels: [],
                },
                {
                  id: '98ca6b69-c5f9-467b-8028-6749cf5b9898',
                  classification: 'SUBTYPE',
                  displayName: 'Pluto',
                  
                  resourcePath: 'SALARY/EXTRA_DISBURSEMENT/PLUTO',
                  resourceName: 'PLUTO',
                  labels: [],
                },
              ],
            },
            {
              id: '4be954e0-1300-4b06-8781-5b69ae72abc7',
              classification: 'TYPE',
              displayName: 'Myndighetspost',
              
              resourcePath: 'SALARY/AUTHORITY_LETTER',
              resourceName: 'AUTHORITY_LETTER',
              labels: [
                {
                  id: '43feacb8-04b4-4a45-b883-8867875c6b96',
                  classification: 'SUBTYPE',
                  displayName: 'Afa',
                  
                  resourcePath: 'SALARY/AUTHORITY_LETTER/AFA',
                  resourceName: 'AFA',
                  labels: [],
                },
                {
                  id: '596aea55-fe5e-4a48-9c0d-0888129b3371',
                  classification: 'SUBTYPE',
                  displayName: 'Arbetsgivarintyg',
                  
                  resourcePath: 'SALARY/AUTHORITY_LETTER/EMPLOYER_CERTIFICATE',
                  resourceName: 'EMPLOYER_CERTIFICATE',
                  labels: [],
                },
                {
                  id: 'b98b0dda-f6c6-450e-91b4-4d9904bdf08e',
                  classification: 'SUBTYPE',
                  displayName: 'Försäkringskassan',
                  
                  resourcePath: 'SALARY/AUTHORITY_LETTER/SSIA',
                  resourceName: 'SSIA',
                  labels: [],
                },
                {
                  id: 'c7ba612b-0375-4fe2-883b-ee7fca41f0c1',
                  classification: 'SUBTYPE',
                  displayName: 'Intyg',
                  
                  resourcePath: 'SALARY/AUTHORITY_LETTER/CERTIFICATE',
                  resourceName: 'CERTIFICATE',
                  labels: [],
                },
                {
                  id: 'c9623696-2571-4e64-a1ea-88034d4637fb',
                  classification: 'SUBTYPE',
                  displayName: 'Kronofogden',
                  
                  resourcePath: 'SALARY/AUTHORITY_LETTER/CROWN_BAILIFF',
                  resourceName: 'CROWN_BAILIFF',
                  labels: [],
                },
              ],
            },
            {
              id: '6feb99dd-b0f6-417c-af9c-35301b195671',
              classification: 'TYPE',
              displayName: 'Schema',
              
              resourcePath: 'SALARY/SCHEDULE',
              resourceName: 'SCHEDULE',
              labels: [
                {
                  id: '1aa1ee42-8676-4c75-80cd-420503a7f0fe',
                  classification: 'SUBTYPE',
                  displayName: 'Scheman',
                  
                  resourcePath: 'SALARY/SCHEDULE/SCHEDULE',
                  resourceName: 'SCHEDULE',
                  labels: [],
                },
                {
                  id: '47ae0a34-c9a6-49b3-92ae-320ffcc1fff4',
                  classification: 'SUBTYPE',
                  displayName: 'Arbetsförändring',
                  
                  resourcePath: 'SALARY/SCHEDULE/JOB_CHANGE',
                  resourceName: 'JOB_CHANGE',
                  labels: [],
                },
                {
                  id: '965e9c2f-9d1e-4a00-a661-c54a9cfbcd7c',
                  classification: 'SUBTYPE',
                  displayName: 'Beredskap',
                  
                  resourcePath: 'SALARY/SCHEDULE/PRERAREDNESS',
                  resourceName: 'PRERAREDNESS',
                  labels: [],
                },
                {
                  id: 'd4af4ac6-4ffd-488a-a7a6-d7d2961a568c',
                  classification: 'SUBTYPE',
                  displayName: 'Förskjuten arbetstid',
                  
                  resourcePath: 'SALARY/SCHEDULE/SHIFTED_WORK_HOURS',
                  resourceName: 'SHIFTED_WORK_HOURS',
                  labels: [],
                },
              ],
            },
            {
              id: '8aac48ac-fed3-49e4-8335-717725b72d74',
              classification: 'TYPE',
              displayName: 'Politiker',
              
              resourcePath: 'SALARY/POLITICIAN',
              resourceName: 'POLITICIAN',
              labels: [
                {
                  id: '706d8a06-d1ad-431f-8f3c-54beba07ac34',
                  classification: 'SUBTYPE',
                  displayName: 'Intyg',
                  
                  resourcePath: 'SALARY/POLITICIAN/CERTIFICATE',
                  resourceName: 'CERTIFICATE',
                  labels: [],
                },
                {
                  id: '8f899f3c-1850-40a4-af05-3377c783d49f',
                  classification: 'SUBTYPE',
                  displayName: 'Närvarolistor',
                  
                  resourcePath: 'SALARY/POLITICIAN/ATTENDANCE_LIST',
                  resourceName: 'ATTENDANCE_LIST',
                  labels: [],
                },
                {
                  id: 'ce756bf6-5a15-45ce-8c45-2a0fe802055c',
                  classification: 'SUBTYPE',
                  displayName: 'Beslutsexpediering',
                  
                  resourcePath: 'SALARY/POLITICIAN/DECISION_DISPATCH',
                  resourceName: 'DECISION_DISPATCH',
                  labels: [],
                },
              ],
            },
            {
              id: '8b6e93d6-6cb3-43d9-b9a6-6715e46458e7',
              classification: 'TYPE',
              displayName: 'Övrigt',
              
              resourcePath: 'SALARY/OTHER',
              resourceName: 'OTHER',
              labels: [
                {
                  id: '17e80c99-eea3-4bfb-a5c6-4238f224a0c2',
                  classification: 'SUBTYPE',
                  displayName: 'Listor',
                  
                  resourcePath: 'SALARY/OTHER/LISTS',
                  resourceName: 'LISTS',
                  labels: [],
                },
                {
                  id: '21357248-4270-4ab8-bf07-968a37259130',
                  classification: 'SUBTYPE',
                  displayName: 'Omkontering',
                  
                  resourcePath: 'SALARY/OTHER/RE_ACCOUNTING',
                  resourceName: 'RE_ACCOUNTING',
                  labels: [],
                },
                {
                  id: '6dfe130d-890f-4b34-b829-a00d6361a7b4',
                  classification: 'SUBTYPE',
                  displayName: 'Blandat',
                  
                  resourcePath: 'SALARY/OTHER/MIXED',
                  resourceName: 'MIXED',
                  labels: [],
                },
                {
                  id: '774c53aa-b077-4f3c-98e1-53607a6ca65d',
                  classification: 'SUBTYPE',
                  displayName: 'Lönefrågor',
                  
                  resourcePath: 'SALARY/OTHER/SALARY_QUERY',
                  resourceName: 'SALARY_QUERY',
                  labels: [],
                },
                {
                  id: '9bf735a5-475e-4b96-b637-bbf769b6bac6',
                  classification: 'SUBTYPE',
                  displayName: '25-årsgåva',
                  
                  resourcePath: 'SALARY/OTHER/TWENTY_FIVE_YEARS_GIFT',
                  resourceName: 'TWENTY_FIVE_YEARS_GIFT',
                  labels: [],
                },
              ],
            },
            {
              id: '97f5ae6a-da13-4270-a51b-ec40f2e4a5ee',
              classification: 'TYPE',
              displayName: 'Önskar kontakt',
              
              resourcePath: 'SALARY/CONTACT_WANTED',
              resourceName: 'CONTACT_WANTED',
              labels: [
                {
                  id: '1b6e6925-42a6-4bea-8d20-ad5921c5fc64',
                  classification: 'SUBTYPE',
                  displayName: 'Testar ändra namn',
                  
                  resourcePath: 'SALARY/CONTACT_WANTED/TEST_LABEL',
                  resourceName: 'TEST_LABEL',
                  labels: [],
                },
              ],
            },
            {
              id: 'c37a08de-e07e-4ddb-a658-a6d7259bf088',
              classification: 'TYPE',
              displayName: 'Skulder',
              
              resourcePath: 'SALARY/DEBTS',
              resourceName: 'DEBTS',
              labels: [
                {
                  id: '3ae2a8d0-ec84-40f1-979f-fe125a89842d',
                  classification: 'SUBTYPE',
                  displayName: 'Skulder',
                  
                  resourcePath: 'SALARY/DEBTS/DEBTS',
                  resourceName: 'DEBTS',
                  labels: [],
                },
              ],
            },
            {
              id: 'e7934973-0d08-4ff6-9849-189d7a02a97a',
              classification: 'TYPE',
              displayName: 'Frånvaro',
              
              resourcePath: 'SALARY/ABSENCE',
              resourceName: 'ABSENCE',
              labels: [
                {
                  id: '15a09e7c-b658-4973-a201-678550c09455',
                  classification: 'SUBTYPE',
                  displayName: 'Tjänstledighet',
                  
                  resourcePath: 'SALARY/ABSENCE/LEAVE_OF_ABSENCE',
                  resourceName: 'LEAVE_OF_ABSENCE',
                  labels: [],
                },
                {
                  id: '322edc8d-8bcd-44c9-8724-b9a5696f61dd',
                  classification: 'SUBTYPE',
                  displayName: 'Vab',
                  
                  resourcePath: 'SALARY/ABSENCE/VAB',
                  resourceName: 'VAB',
                  labels: [],
                },
                {
                  id: '4f13eb9a-2b38-4abe-9403-5e4aae47e7af',
                  classification: 'SUBTYPE',
                  displayName: 'Sjukfrånvaro',
                  
                  resourcePath: 'SALARY/ABSENCE/SICKNESS_ABSENCE',
                  resourceName: 'SICKNESS_ABSENCE',
                  labels: [],
                },
                {
                  id: '56013848-d038-4527-8bb6-b1d9b518e792',
                  classification: 'SUBTYPE',
                  displayName: 'Föräldrarledighet',
                  
                  resourcePath: 'SALARY/ABSENCE/PARENTAL_LEAVE',
                  resourceName: 'PARENTAL_LEAVE',
                  labels: [],
                },
                {
                  id: 'cbe8785e-b615-4c57-8891-7863b2365a5a',
                  classification: 'SUBTYPE',
                  displayName: 'Semester',
                  
                  resourcePath: 'SALARY/ABSENCE/VACATION',
                  resourceName: 'VACATION',
                  labels: [],
                },
              ],
            },
          ],
        },
      ],
    },
  statuses: [
    { name: 'ASSIGNED', created: '2024-10-21T09:40:43.569+02:00' },
    { name: 'AWAITING_INTERNAL_RESPONSE', created: '2024-07-01T14:14:36.075+02:00' },
    { name: 'NEW', created: '2024-07-01T14:14:07.576+02:00' },
    { name: 'ONGOING', created: '2024-07-01T14:14:16.177+02:00' },
    { name: 'PENDING', created: '2024-07-01T14:14:21.051+02:00' },
    { name: 'SOLVED', created: '2024-07-01T14:14:26.172+02:00' },
    { name: 'SUSPENDED', created: '2024-07-01T14:14:31.311+02:00' },
  ],
  roles: [
    { name: 'APPROVER', displayName: 'Godkännande chef', created: '2024-11-04T16:24:46.147+01:00' },
    { name: 'CONTACT', displayName: 'Kontaktperson', created: '2024-11-04T16:21:54.435+01:00' },
    { name: 'EMPLOYEE', displayName: 'Anställd', created: '2024-10-17T15:24:58.371+02:00' },
    { name: 'MANAGER', displayName: 'Chef', created: '2024-10-17T15:25:27.503+02:00' },
    { name: 'PRIMARY', displayName: 'Ärendeägare', created: '2024-11-04T16:21:45.904+01:00' },
    { name: 'SUBSTITUTE', displayName: 'Ersättare', created: '2024-11-04T16:24:52.231+01:00' },
    { name: 'USER', displayName: 'Användare', created: '2024-10-17T15:26:01.175+02:00' },
  ],
};
