import { DecisionOutcome, DecisionType } from '@casedata/interfaces/decision';

export const mockRecommendedDecision = {
  data: {
    id: 29,
    version: 0,
    created: '2022-12-13T13:36:02.720874+01:00',
    updated: '2022-12-13T13:36:02.720888+01:00',
    validFrom: '2022-12-13T13:36:02.720874+01:00',
    validTo: '2022-12-13T13:36:02.720888+01:00',
    decisionType: 'RECOMMENDED' as DecisionType,
    decisionOutcome: 'APPROVAL' as DecisionOutcome,
    description:
      'Personen är boende i Sundsvalls kommun. Nuvarande kontroll ger rekommenderat beslut att godkänna ansökan.',
    law: [],
    attachments: [],
    extraParameters: {},
  },
  message: 'success',
};

export const mockProposedDecision = {
  data: {
    id: 29,
    version: 0,
    created: '2022-12-13T13:36:02.720874+01:00',
    updated: '2022-12-13T13:36:02.720888+01:00',
    validFrom: '2022-12-13T13:36:02.720874+01:00',
    validTo: '2022-12-13T13:36:02.720888+01:00',
    decisionType: 'PROPOSED' as DecisionType,
    decisionOutcome: 'APPROVAL' as DecisionOutcome,
    description: 'Utredningstext',
    law: [],
    attachments: [],
    extraParameters: {},
  },
  message: 'success',
};

export const mockFinalDecision = {
  data: {
    id: 1,
    created: '2023-10-23T09:30:11.009272+02:00',
    updated: '2024-08-22T08:08:27.281423+02:00',
    decisionType: 'FINAL',
    decisionOutcome: 'APPROVAL',
    description: '<p>test</p>',
    law: [
      {
        heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
        sfs: 'Trafikförordningen (1998:1276)',
        chapter: '13',
        article: '8',
      },
    ],
    decidedAt: '2024-08-22T08:08:27.918+02:00',
    validFrom: '2033-10-23T00:00:00+02:00',
    validTo: '2033-10-24T00:00:00+02:00',
    attachments: [
      {
        id: '1',
        created: '2024-08-22T08:08:27.274543+02:00',
        updated: '2024-08-22T08:08:27.27456+02:00',
        category: 'BESLUT',
        name: 'beslut-arende-SGP-2022-000019',
        note: '',
        extension: 'pdf',
        mimeType: 'application/pdf',
        file: '',
        extraParameters: {},
      },
    ],
    extraParameters: {},
  },
  message: 'success',
};

export const mockPdfRender = {
  data: {
    output:
      'JVBERi0xLjcKJeLjz9MKNSAwIG9iago8PC9GaWx0ZXIvRmxhdGVEZWNvZGUvTGVuZ3RoIDUzOT4+c3RyZWFtCnicjVTdTtswFL7PU5xLKrXGP7Fj966IwTYqxmjgqjdR4xZo4pTEQdoT7UX2KDzIXGgyaxS3ihKdo3zn+86Pj58jpQC7h3PEgQlImHTGooxOv5UEzqvoZ/QcnaXR6QUBgt2vdBkJDAkhiEpI8+jkMrPtCKrFA2yyep295Lowj2alDQzSp+hLuo+BSImU9FkCYCcnlOiAF691bp9eTWND/Fgh4UcdoJd9HrPW5M1LVhQNrKuybA1ggUdEEYxxgIQSjiT1iQJgxhWKj8UKihj1O/VdbzZNZYawNXQgNGYKseTIJu90vJbN0h+3l5N0cg3kkEh8ZKs7kX+VS06BEZjdXZ/P7ifTaUjJBSdHdm0701h2wD+1Nrk2bVnqegw3t19HFFMxchPFXIWGSiUS3Gc6IMlYB7zRtZtRJ0mUwpgQSpkKHyJnSJ/mA5gCJTs1rgjC4g12ppuitcHcuOj7ZrXbHRpGM46SY0rmzt7RvicB2hSPKzsG9RvmJ9Ns5b6u/GScMDEfzAfIo8NIQvfWqy1dLBSiHMqIxwRJ1flF7yfYOVtgb3SI5X8Zyl2GMYtRHH+y23tre4skbkcF86MD4K0MUR3wqjI2W9uFNlbXIQnqJGI/8oAE3ldJY7O8eWibIVz9qtfVKrOZcQduCD0mwEqlQor4zOEUmOxzTXWhl5UZ7+5Hh4LPbsj3aoVbpsRnOCCVfKwWNbqP+QslkongCmVuZHN0cmVhbQplbmRvYmoKNCAwIG9iago8PC9Db250ZW50cyA1IDAgUi9NZWRpYUJveFswIDAgNTk1IDg0Ml0vUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA2IDAgUi9GMiA3IDAgUj4+L1hPYmplY3Q8PC9JbTEgOCAwIFI+Pj4+L1RyaW1Cb3hbMCAwIDU5NSA4NDJdL1R5cGUvUGFnZT4+CmVuZG9iagoxIDAgb2JqCjw8L0xhbmcoZW4pL1BhZ2VzIDIgMCBSL1R5cGUvQ2F0YWxvZz4+CmVuZG9iagozIDAgb2JqCjw8L0NyZWF0aW9uRGF0ZShEOjIwMjYwMjA1MTM0NzUzKzAxJzAwJykvTW9kRGF0ZShEOjIwMjYwMjA1MTM0NzUzKzAxJzAwJykvUHJvZHVjZXIoaVRleHSuIHBkZkhUTUwgNi4zLjEgXChBR1BMIHZlcnNpb25cKSCpMjAwMC0yMDI1IEFwcnlzZSBHcm91cCBOVik+PgplbmRvYmoKNiAwIG9iago8PC9CYXNlRm9udC9IZWx2ZXRpY2EvRW5jb2RpbmcvV2luQW5zaUVuY29kaW5nL1N1YnR5cGUvVHlwZTEvVHlwZS9Gb250Pj4KZW5kb2JqCjcgMCBvYmoKPDwvQmFzZUZvbnQvSGVsdmV0aWNhLUJvbGQvRW5jb2RpbmcvV2luQW5zaUVuY29kaW5nL1N1YnR5cGUvVHlwZTEvVHlwZS9Gb250Pj4KZW5kb2JqCjIgMCBvYmoKPDwvQ291bnQgMS9LaWRzWzQgMCBSXS9UeXBlL1BhZ2VzPj4KZW5kb2JqCjggMCBvYmoKPDwvQml0c1BlckNvbXBvbmVudCA4L0NvbG9yU3BhY2VbL0NhbFJHQiA8PC9HYW1tYVsyLjIgMi4yIDIuMl0vTWF0cml4WzAuNDEyMzkgMC4yMTI2NCAwLjAxOTMzIDAuMzU3NTggMC43MTUxNyAwLjExOTE5IDAuMTgwNDUgMC4wNzIxOCAwLjk1MDRdL1doaXRlUG9pbnRbMC45NTA0MyAxIDEuMDldPj5dL0ZpbHRlci9GbGF0ZURlY29kZS9IZWlnaHQgNzQvSW50ZW50L1BlcmNlcHR1YWwvTGVuZ3RoIDUxL1NNYXNrIDkgMCBSL1N1YnR5cGUvSW1hZ2UvVHlwZS9YT2JqZWN0L1dpZHRoIDEzMj4+c3RyZWFtCnic7cExAQAAAMKg9U9tDQ+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHg0cngAAQplbmRzdHJlYW0KZW5kb2JqCjkgMCBvYmoKPDwvQml0c1BlckNvbXBvbmVudCA4L0NvbG9yU3BhY2UvRGV2aWNlR3JheS9GaWx0ZXIvRmxhdGVEZWNvZGUvSGVpZ2h0IDc0L0xlbmd0aCAyMDI2L1N1YnR5cGUvSW1hZ2UvVHlwZS9YT2JqZWN0L1dpZHRoIDEzMj4+c3RyZWFtCnic7Zh9WFRlFsDPnYFhVo1BUxfNVByQFBW08mNX1ExAjD7gITHW0g3zYVXK/Hj8SFMxpLHUp2zDFiPNMBKd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',
  },
  message: 'Decision PDF rendered',
};
