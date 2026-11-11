export const capitalize = (value?: string | null): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
