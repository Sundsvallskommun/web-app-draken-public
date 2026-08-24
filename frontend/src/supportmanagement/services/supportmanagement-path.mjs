/** @param {string} value */
export const trimSupportManagementPath = (value) => {
  const trimmedValue = value.trim();
  let start = 0;
  while (trimmedValue[start] === '/') start += 1;

  let end = trimmedValue.length;
  while (end > start && trimmedValue[end - 1] === '/') end -= 1;
  return trimmedValue.slice(start, end);
};

/** @param {string | undefined} value */
export const normalizeSupportManagementResourcePath = (value) => trimSupportManagementPath(value ?? '').toUpperCase();
