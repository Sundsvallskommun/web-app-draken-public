/** Whether a 10- or 12-digit personal or organization number has a valid check digit. */
export const luhnCheck = (str = ''): boolean => {
  str = str.length === 12 ? str.slice(2) : str;
  let sum = 0;
  for (let i = 0, l = str.length; i < l; i++) {
    let v = Number.parseInt(str[i], 10);
    v *= 2 - (i % 2);
    if (v > 9) {
      v -= 9;
    }
    sum += v;
  }
  return sum % 10 === 0;
};
