'use client';

import LoaderFullScreen from '@common/components/loader/loader-fullscreen';
import { getAdminUsers } from '@common/services/user-service';
import { useAppContext } from '@contexts/app.context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const RootIndex = () => {
  const router = useRouter();

  const { setAdministrators, setMunicipalityId } = useAppContext();

  useEffect(() => {
    setMunicipalityId(process.env.NEXT_PUBLIC_MUNICIPALITY_ID || '');
    getAdminUsers().then((data) => {
      setAdministrators(data);
    });

    router.push('/oversikt');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <LoaderFullScreen />;
};

export default RootIndex;
