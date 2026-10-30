// Same rules as frontend/src/common/utils/phoneNumberFormatter-utils.ts, so a number stored before the frontend
// formatted it (e.g. 070-174 06 35) is sent as +46701740635, the format the sms endpoint in Messaging requires
export const phoneNumberFormatter = (phoneNumber: string | undefined): string => {
  if (!phoneNumber) return '';

  let formatted = phoneNumber.trim().replace(/[- ]/g, '');

  formatted = formatted.replace(/^0{3,}/, '00');

  if (formatted.startsWith('00')) {
    return formatted.replace(/^00/, '+');
  }

  if (formatted.startsWith('0')) {
    return formatted.replace(/^0/, '+46');
  }

  return formatted;
};
