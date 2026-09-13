'use client';

import './bootstrap';

/**
 * Renders nothing; the import above is the point. Server components and client components are
 * bundled into separate module graphs, so `layout.tsx` importing `./bootstrap` configures only the
 * server-component graph. Rendering this client component pulls `./bootstrap` into the client
 * graph too - both the SSR pass and the browser - before `AppLayout` and anything under it runs.
 */
export const DragonBootstrap = (): null => null;
