import { ErrandPageClient } from './errand-page-client';

interface ArendePageProps {
  params: Promise<{ errandNumber: string; locale: string }>;
}

export default async function ArendePage({ params }: ArendePageProps) {
  const { errandNumber } = await params;
  return <ErrandPageClient errandNumber={errandNumber} />;
}
