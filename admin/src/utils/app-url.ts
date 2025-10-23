export const appURL = (path?: string): string => {
  return `${window.location.origin}${path || process.env.NEXT_PUBLIC_BASE_PATH}`;
};
