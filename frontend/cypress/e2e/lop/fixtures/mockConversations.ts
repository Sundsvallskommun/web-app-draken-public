export const mockConversationMessages = {
  data: [
    {
      conversationId: 'abababab-ed21-4b30-9e0c-1252c878153e',
      messageId: 'b588c13d-7e23-44b8-b862-8581cec40757',
      sent: '2025-07-09T11:24:04.093Z',
      message: '<p>hej hej.</p>',
      attachments: [],
      messageType: 'DRAKEN',
      subject: 'Ärende: #KS-00000000',
      firstName: 'Testperson',
      lastName: 'Testpersonsson',
      direction: 'INBOUND',
      viewed: 'true',
    },
    {
      conversationId: 'abababab-ed21-4b30-9e0c-1252c878153f',
      messageId: 'd553003a-da2c-42d1-84aa-68b53aa7ea5f',
      sent: '2025-07-09T11:23:42.122Z',
      message: '<p>Hej,</p><p><br /></p><p>Tack för att du kontaktar oss.</p>',
      attachments: [],
      messageType: 'DRAKEN',
      subject: 'Ärende: #KS-00000000',
      firstName: 'Testperson',
      lastName: 'Testpersonsson',
      direction: 'INBOUND',
      viewed: 'true',
    },
  ],
  message: 'success',
};

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