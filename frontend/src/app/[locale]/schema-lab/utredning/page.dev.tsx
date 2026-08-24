import { InvestigationSchemaLabClient } from '@supportmanagement/investigation/schema-lab/investigation-schema-lab-client.component';
import { notFound } from 'next/navigation';

/**
 * Developer sandbox for previewing the IAF/VOF investigation forms. See
 * `supportmanagement/investigation/README.md` for what it is for and how to run it.
 *
 * The `.dev.tsx` extension keeps this route out of production builds entirely - `pageExtensions`
 * in next.config.js only accepts it outside production. The guard below is the second lock: it
 * keeps the lab off every profile except IAF when Next does compile the route.
 */
export default function InvestigationSchemaLabPage() {
  if (process.env.NEXT_PUBLIC_APPLICATION !== 'IAF') notFound();

  return <InvestigationSchemaLabClient />;
}
