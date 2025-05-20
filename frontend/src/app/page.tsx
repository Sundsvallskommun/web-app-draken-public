'use client';

import LoaderFullScreen from '@common/components/loader/loader-fullscreen';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    router.push('/oversikt');
  });
  return <LoaderFullScreen />;
}
