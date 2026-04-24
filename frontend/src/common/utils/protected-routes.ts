export const protectedRoutes = (import.meta.env.VITE_PROTECTED_ROUTES || '').split(',').filter(Boolean);
