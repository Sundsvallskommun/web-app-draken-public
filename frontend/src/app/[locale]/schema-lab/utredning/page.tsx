import { InvestigationSchemaLabClient } from '@supportmanagement/investigation/schema-lab/investigation-schema-lab-client.component';
import { notFound } from 'next/navigation';

export default function InvestigationSchemaLabPage() {
  // Keep the isolated IAF lab unlocked in local development so testers can reach it without progressing a real errand.
  const isIafDevelopment = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_APPLICATION === 'IAF';
  if (!isIafDevelopment) notFound();

  return <InvestigationSchemaLabClient />;
}
