export const mockForwardSupportMessage = {
  contactMeans: 'email',
  recipientEmail: 'test@test.se',
  plaintextMessage:
    'Hej! Kundtjänst har tagit emot ett meddelande enligt nedan: Ärendenummer (saknas) Beskrivning (saknas) Ärendeuppgifter Kontaktväg: Chatt Förvaltning: BoU Ärendetyp: Barnomsorgshandläggning, fakturor Kontaktuppgifter Namn: (saknas) Adress: (saknas) Telefonnummer: (saknas) E-postadress: (saknas) Bifogade filer: (inga) Med vänliga hälsningar Kundtjänst',
  htmlMessage:
    ' <p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0">Hej!</p><p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0">Kundtjänst har tagit emot ett meddelande enligt nedan:</p><p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0">Ärendenummer (saknas)</p><p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0"><strong>Beskrivning</strong></p><p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0">(saknas)</p><p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0"><strong>Ärendeuppgifter</strong></p><p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0"><strong>Kontaktväg:</strong> Chatt</p><p style="margin-top:0;margin-bottom:0"><strong>Förvaltning:</strong> BoU</p><p style="margin-top:0;margin-bottom:0"><strong>Ärendetyp:</strong> Barnomsorgshandläggning, fakturor</p><p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0"><strong>Kontaktuppgifter</strong></p><p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0"><strong>Namn:</strong> (saknas)</p><p style="margin-top:0;margin-bottom:0"><strong>Adress:</strong> (saknas)</p><p style="margin-top:0;margin-bottom:0"><strong>Telefonnummer:</strong> (saknas)</p><p style="margin-top:0;margin-bottom:0"><strong>E-postadress:</strong> (saknas)</p><p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0">Bifogade filer: (inga)</p><p style="margin-top:0;margin-bottom:0"><br /></p><p style="margin-top:0;margin-bottom:0">Med vänliga hälsningar</p><p style="margin-top:0;margin-bottom:0">Kundtjänst</p></div>',
  senderName: 'Anne Bergqvist',
  subject: 'Vidarebefordran av ärende',
};

export const mockForwardSupportErrandToMEX = {
  caseType: 'MEX_FORWARDED_FROM_CONTACTSUNDSVALL',
  priority: 'MEDIUM',
  channel: 'EMAIL',
  description: 'TEST',
  stakeholders: [
    {
      type: 'PERSON',
      roles: [],
      addresses: [],
      contactInformation: [],
      firstName: 'Kalle',
      lastName: 'Anka',
    },
  ],
  facilities: [],
  statuses: [
    {
      statusType: 'Ärende inkommit',
      description: 'Ärende inkommit',
      dateTime: '2025-01-08T13:03:09.832Z',
    },
  ],
  extraParameters: [{ key: 'supportManagementErrandNumber', values: [] }],
};
