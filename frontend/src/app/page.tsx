'use client';

import LoaderFullScreen from '@common/components/loader/loader-fullscreen';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const RootIndex = () => {
  const router = useRouter();

  useEffect(() => {
    router.push('/oversikt');
  }, [router]);

  return <LoaderFullScreen />;
};

export default RootIndex;
