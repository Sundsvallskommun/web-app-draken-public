export const appURL = (path?: string): string => {
  const origin = globalThis.window?.location?.origin || '';
  const base = import.meta.env.VITE_BASEPATH || '';

  return path ? `${origin}${base}${path}` : `${origin}${base}`;
};
