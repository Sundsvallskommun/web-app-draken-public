export const mockConversationMessages = {
  data: [
    {
      conversationId: 'abababab-ed21-4b30-9e0c-1252c878153e',
      communicationID: 'abababab-ed21-4b30-9e0c-1252c878153e',
      messageId: 'b588c13d-7e23-44b8-b862-8581cec40757',
      sent: '2025-07-09T11:24:04.093Z',
      messageBody: '<p>hej hej.</p>',
      communicationAttachments: [],
      communicationType: 'DRAKEN',
      subject: 'Ärende: #KS-00000000',
      sender: 'Testperson Testpersonsson',
      direction: 'INBOUND',
      viewed: true,
    },
    {
      conversationId: 'abababab-ed21-4b30-9e0c-1252c878153f',
      communicationID: 'abababab-ed21-4b30-9e0c-1252c878153f',
      messageId: 'd553003a-da2c-42d1-84aa-68b53aa7ea5f',
      sent: '2025-07-09T11:23:42.122Z',
      messageBody: '<p>Hej,</p><p><br /></p><p>Tack för att du kontaktar oss.</p>',
      communicationAttachments: [],
      communicationType: 'DRAKEN',
      subject: 'Ärende: #KS-00000000',
      sender: 'Testperson Testpersonsson',
      direction: 'INBOUND',
      viewed: true,
    },
  ],
  message: 'success',
};

export const mockConversationReadByCounts = [
  {
    conversationId: 'cdcdcdcd-ed21-4b30-9e0c-1252c878153e',
    messageCount: 1,
    readByCount: [],
    readByPartCount: [
      { part: 'KC-00000001', count: 1 },
      { part: 'LOP-24120103', count: 1 },
    ],
  },
  {
    conversationId: 'abababab-ed21-4b30-9e0c-1252c878153f',
    messageCount: 2,
    readByCount: [],
    readByPartCount: [
      { part: 'KC-00000001', count: 0 },
      { part: 'LOP-24120103', count: 1 },
    ],
  },
];

export const mockConversations = {
  data: {
    data: [
      {
        id: 'cdcdcdcd-ed21-4b30-9e0c-1252c878153e',
        topic: 'Meddelande från Mina sidor',
        type: 'EXTERNAL',
        relationIds: [],
      },
      {
        id: 'abababab-ed21-4b30-9e0c-1252c878153f',
        topic: 'Ärende: #KS-00000000',
        type: 'INTERNAL',
        relationIds: ['bd835475-cbc2-4b92-979d-8bc18bd75385'],
      },
    ],
    message: 'success',
  },
  message: 'success',
};
