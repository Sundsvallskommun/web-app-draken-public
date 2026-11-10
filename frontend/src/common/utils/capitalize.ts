// Uppercases the first character and leaves the rest untouched (same behaviour as underscore.string's capitalize).
export const capitalize = (value?: string | null): string => {
  const str = value ?? '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};
