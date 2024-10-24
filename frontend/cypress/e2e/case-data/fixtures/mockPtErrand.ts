import { ApiErrand } from '@casedata/interfaces/errand';
import { ErrandPhase } from '@casedata/interfaces/errand-phase';
import { Priority } from '@casedata/interfaces/priority';
import { Role } from '@casedata/interfaces/role';
import { mockProposedDecision, mockRecommendedDecision } from './mockDecisions';

// This person number is for test purposes, from the Swedish Tax Agency
export const MOCK_PERSON_NUMBER = '199001162396';

export const mockPTErrand_base: { data: ApiErrand; message: string } = {
  data: {
    id: 442,
    channel: 'WEB_UI',
    description: 'Nytt parkeringstillstånd',
    startDate: '2023-12-14T13:44:22.981412+01:00',
    endDate: '2023-12-14T13:44:22.981412+01:00',
    diaryNumber: 'PRH-2022-000019',
    applicationReceived: '2023-12-14T13:44:22.981412+01:00',
    created: '2023-12-14T13:44:22.981412+01:00',
    updated: '2024-07-04T16:18:05.817651+02:00',
    errandNumber: 'PRH-2022-000019',
    externalCaseId: '3830',
    caseType: 'PARKING_PERMIT',
    priority: Priority.MEDIUM,
    caseTitleAddition: 'Nytt parkeringstillstånd',
    phase: ErrandPhase.beslut,
    statuses: [
      {
        statusType: 'Ärende inkommit',
        description: '',
        dateTime: '2023-12-14T13:50:45.765+01:00',
      },
      {
        statusType: 'Under utredning',
        description: 'Ärendet utreds',
        dateTime: '2023-12-14T13:51:14.635643+01:00',
      },
    ],
    municipalityId: '2281',
    stakeholders: [
      {
        id: '222',
        created: '2023-12-14T13:44:22.982465+01:00',
        updated: '2023-12-14T13:44:22.982469+01:00',
        type: 'PERSON',
        firstName: 'Test',
        lastName: 'Personsson',
        personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
        roles: [Role.APPLICANT],
        addresses: [
          {
            addressCategory: 'POSTAL_ADDRESS',
            street: 'TESTGATAN 0',
            postalCode: '853 56',
            city: 'SUNDSVALL',
            apartmentNumber: '',
            careOf: 'Personsson',
          },
        ],
        contactInformation: [
          {
            contactType: 'PHONE',
            value: Cypress.env('mockPhoneNumber'),
          },
          {
            contactType: 'EMAIL',
            value: Cypress.env('mockEmail'),
          },
        ],
        extraParameters: {},
        personalNumber: Cypress.env('mockPersonNumber'),
      },
      {
        id: '223',
        created: '2023-12-14T13:50:46.417444+01:00',
        updated: '2023-12-14T13:50:46.417449+01:00',
        type: 'PERSON',
        firstName: 'My',
        lastName: 'Testsson',
        adAccount: 'kctest',
        personId: 'aaaabbbb-aaaa-bbbb-aaaa-da8ca388888c',
        personalNumber: MOCK_PERSON_NUMBER,
        roles: [Role.ADMINISTRATOR],
        addresses: [],
        contactInformation: [],
        extraParameters: {},
      },
      {
        id: '2260',
        created: '2024-06-10T14:25:47.461919+02:00',
        updated: '2024-06-10T14:35:06.168435+02:00',
        type: 'PERSON',
        firstName: 'Test',
        lastName: 'Testsson',
        organizationName: '',
        roles: [Role.CONTACT_PERSON],
        personalNumber: MOCK_PERSON_NUMBER,
        personId: 'aaaabbbb-aaaa-bbbb-aaaa-cccccccccccc',
        addresses: [
          {
            addressCategory: 'POSTAL_ADDRESS',
            street: 'Testgata 1',
            postalCode: '12345',
            city: 'Staden',
            careOf: '',
            apartmentNumber: '',
          },
        ],
        contactInformation: [
          {
            contactType: 'PHONE',
            value: Cypress.env('mockPhoneNumber'),
          },
          {
            contactType: 'EMAIL',
            value: Cypress.env('mockEmail'),
          },
        ],
        extraParameters: {},
      },
    ],
    facilities: [],
    decisions: [
      mockRecommendedDecision.data,
      mockProposedDecision.data,
      {
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
        validFrom: '2023-10-23T00:00:00+02:00',
        validTo: '2023-10-23T00:00:00+02:00',
        attachments: [
          {
            id: '1',
            created: '2024-08-22T08:08:27.274543+02:00',
            updated: '2024-08-22T08:08:27.27456+02:00',
            category: 'BESLUT',
            name: 'beslut-arende-PRH-2022-000019',
            note: '',
            extension: 'pdf',
            mimeType: 'application/pdf',
            file: '',
            extraParameters: {},
          },
        ],
        extraParameters: {},
      },
    ],
    appeals: [],
    notes: [
      {
        id: '437',
        created: '2024-06-20T08:47:39.244404+02:00',
        updated: '2024-06-20T08:47:39.25419+02:00',
        title: 'Test',
        text: '<p>Mock note</p>',
        createdBy: 'TESTUSER',
        updatedBy: 'TESTUSER',
        noteType: 'PUBLIC',
        extraParameters: {},
      },
      {
        id: '438',
        created: '2024-06-20T08:47:39.244404+02:00',
        updated: '2024-06-20T08:47:39.25419+02:00',
        title: 'Test',
        text: '<p>Mock comment</p>',
        createdBy: 'TESTUSER',
        updatedBy: 'TESTUSER',
        noteType: 'INTERNAL',
        extraParameters: {},
      },
    ],
    messageIds: [],
    extraParameters: {
      'disability.walkingAbility': 'false',
      'disability.walkingDistance.beforeRest': '85',
      'disability.walkingDistance.max': '150',
      'process.phaseStatus': 'WAITING',
      'application.applicant.testimonial': 'true',
      'consent.view.transportationServiceDetails': 'false',
      'disability.aid': 'Elrullstol,Rullator',
      'application.role': 'SELF',
      'application.applicant.capacity': 'DRIVER',
      'application.applicant.signingAbility': 'true',
      'application.renewal.changedCircumstances': 'Y',
      'application.renewal.expirationDate': '2023-12-14',
      'application.renewal.medicalConfirmationRequired': 'yes',
      'application.lostPermit.policeReportNumber': '123456',
      'consent.contact.doctor': 'false',
      'application.reason': 'Kan inte gå',
      'process.phaseAction': 'UNKNOWN',
      'disability.duration': 'P0Y',
    },
  },
  message: 'success',
};

export const modifyPatchExtraParameter: (
  base: { [key: string]: any },
  obj: { [key: string]: any }
) => { [key: string]: any } = (base, obj) => ({
  ...base,
  extraParameters: { ...base.extraParameters, ...obj },
});