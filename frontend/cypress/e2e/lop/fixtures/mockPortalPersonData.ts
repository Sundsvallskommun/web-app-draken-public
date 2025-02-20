export const mockPortalPersonData_internal = {
  data: {
    personid: 'aaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    givenname: 'Test',
    lastname: 'Personsson',
    fullname: 'Personsson Test',
    address: '',
    postalCode: '',
    city: '',
    workPhone: '',
    aboutMe:
      'HR-administratör, lönehantering, objektspecialist Hogia och Guru - tidskrivning, personförsäkring/försäkringsinformatör, pensionsinformation.',
    email: 'kommunen@example.com',
    mailNickname: 'test.personsson',
    company: 'Sundsvalls Kommun',
    companyId: 1,
    orgTree:
      '2|28|Kommunstyrelsekontoret¤3|440|KSK Avdelningar¤4|2835|KSK AVD Digital Transformation¤5|11211|KSK Avd Strategi och styrning¤6|10925|KSK Avd Strategi och styrning',
    isManager: false,
    loginName: 'INTERNALUSER',
    referenceNumber: 'TE11PE123',
  },
  message: 'success',
};

export const mockPortalPersonData_external = {
  data: {
    personid: 'aaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    givenname: 'Test',
    lastname: 'Personsson',
    fullname: 'Personsson Test',
    address: '',
    postalCode: '',
    city: '',
    workPhone: '',
    aboutMe:
      'HR-administratör, lönehantering, objektspecialist Hogia och Guru - tidskrivning, personförsäkring/försäkringsinformatör, pensionsinformation.',
    email: 'kommunaltbolag@example.com',
    mailNickname: 'test.personsson',
    company: 'Sundsvall Elnät AB',
    companyId: 11,
    orgTree: '2|9849|Sundsvall Elnät¤3|9887|Elnät Stöd och stab¤4|9863|Elnät HR¤5|9835|Elnät HR¤6|9871|Elnät HR',
    isManager: false,
    loginName: 'EXTERNALUSER',
  },
  message: 'success',
};
