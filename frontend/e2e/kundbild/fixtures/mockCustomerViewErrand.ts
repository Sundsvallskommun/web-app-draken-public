import { mockSupportErrand } from '../../kontaktcenter/fixtures/mockSupportErrands';

// KC-fixturen ger alla tre intressenterna samma externalId, vilket gör dem till samma person
// i appens ögon — ärendeägarkontrollen jämför partyId. Kundbilden behöver kontaktpersoner som
// faktiskt är andra personer än kunden, annars går det inte att se skillnad på vad som visas
// för ärendeägaren och vad som visas för en kontaktperson.
export const ownerPartyId = 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc';

export const mockCustomerViewErrand = {
  ...mockSupportErrand,
  stakeholders: mockSupportErrand.stakeholders.map((stakeholder, index) =>
    stakeholder.role === 'PRIMARY'
      ? { ...stakeholder, externalId: ownerPartyId }
      : { ...stakeholder, externalId: `contact-party-${index}` }
  ),
};
