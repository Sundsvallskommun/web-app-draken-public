export const serviceTravelTypes = [
  { key: 'PR', value: 'Privatresor' },
  { key: 'AR', value: 'Arbets-/utbildningsresor' },
  { key: 'GY', value: 'Gymnasieresor' },
];

export const serviceModeOfTransportation = [
  { key: 'LTAXI', value: 'Taxibil' },
  { key: 'STAXI', value: 'Stor taxibil' },
  { key: 'LMULTI', value: 'Litet multifordon' },
  { key: 'SMULTI', value: 'Stort multifordon' },
];

export const serviceAids = [
  { key: 'O', value: 'Rollator' },
  { key: 'U', value: 'Manuell rullstol (hopfällbar)' },
  { key: 'ER', value: 'Elrullstol' },
  { key: 'REM', value: 'Elmoped/elscooter' },
  { key: 'KR', value: 'Kryckor/käpp' },
  { key: 'ST', value: 'Stavar' },
  { key: 'V', value: 'Vagn' },
  { key: 'O2', value: 'Syrgas' },
  { key: 'BBS', value: 'Bälteskudde' },
  { key: 'LH', value: 'Ledarhund' },
];

export const serviceAddons = [
  { key: 'LS', value: 'Ledsagare' },
  { key: 'HLB', value: 'Hämta/lämnas i bostaden av chauffören' },
  { key: 'F', value: 'Framsätesplacering' },
  { key: 'BH', value: 'Baksätesplacering (Höger)' },
  { key: 'BV', value: 'Baksätesplacering (Vänster)' },
  { key: 'BS', value: 'Tillgång till hela baksätet' },
  { key: 'SAMG', value: 'Begränsad samåkning' },
  { key: 'E', value: 'Ensamåkning' },
  { key: 'MO', value: 'Begränsning i omväg' },
  { key: 'MB', value: 'Medföljande egna barn' },
  { key: 'H', value: 'Bärhjälp' },
  { key: 'D', value: 'Litet djur' },
];

export const travelTypeMap = Object.fromEntries(serviceTravelTypes.map((t) => [t.value, t.key]));
export const transportMap = Object.fromEntries(serviceModeOfTransportation.map((t) => [t.value, t.key]));
export const aidMap = Object.fromEntries(serviceAids.map((a) => [a.value, a.key]));
export const addonMap = Object.fromEntries(serviceAddons.map((a) => [a.value, a.key]));

export const aidValueToKeyMap = Object.fromEntries(serviceAids.map((a) => [a.value, a.key]));
export const addonValueToKeyMap = Object.fromEntries(serviceAddons.map((a) => [a.value, a.key]));
export const transportKeyMap = Object.fromEntries(serviceModeOfTransportation.map((t) => [t.value, t.key]));
export const travelTypeKeyMap = Object.fromEntries(serviceTravelTypes.map((t) => [t.value, t.key]));

export const travelTypeValueMap = Object.fromEntries(serviceTravelTypes.map((t) => [t.key, t.value]));
export const transportValueMap = Object.fromEntries(serviceModeOfTransportation.map((t) => [t.key, t.value]));
