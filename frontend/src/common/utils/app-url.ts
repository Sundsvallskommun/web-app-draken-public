export const appURL = (path?: string): string => {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || '';

  const base = process.env.NEXT_PUBLIC_BASEPATH || '';

  return path ? `${origin}${base}${path}` : `${origin}${base}`;
};
