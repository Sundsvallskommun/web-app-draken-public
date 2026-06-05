export enum Channels {
  EMAIL = 'E-post',
  ESERVICE = 'E-tjänst',
  WEB_UI = 'Webgränssnitt',
  ESERVICE_KATLA = 'E-tjänst Färdstjänstregistrering',
  MOBILE = 'Telefon',
  SYSTEM = 'System',
  MY_PAGES = 'Mina sidor',
}

export enum ApiChannels {
  'E-post' = 'EMAIL',
  'E-tjänst' = 'ESERVICE',
  'Webgränssnitt' = 'WEB_UI',
  'E-tjänst Färdtjänstregistrering' = 'ESERVICE_KATLA',
  'Telefon' = 'MOBILE',
  'System' = 'SYSTEM',
  'Mina sidor' = 'MY_PAGES',
}
export const AppChannels = {
  MEX: [Channels.EMAIL, Channels.ESERVICE, Channels.WEB_UI, Channels.MOBILE, Channels.SYSTEM, Channels.MY_PAGES],
  PT: [
    Channels.EMAIL,
    Channels.ESERVICE,
    Channels.WEB_UI,
    Channels.ESERVICE_KATLA,
    Channels.MOBILE,
    Channels.SYSTEM,
    Channels.MY_PAGES,
  ],
};
