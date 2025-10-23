import { ListToolbar } from '@components/list-toolbar/list-toolbar';
import { ResourceName } from '@interfaces/resource-name';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import { Header } from '@layouts/header/header.component';
import Main from '@layouts/main/main.component';
import { Spinner } from '@sk-web-gui/react';
import { useResource } from '@utils/use-resource';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { capitalize } from 'underscore.string';

interface ListLayoutProp {
  resource: ResourceName;
  properties?: string[];
  children?: React.ReactNode;
}

export const ListLayout: React.FC<ListLayoutProp> = ({ resource, properties, children }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { loading, refresh } = useResource(resource);

  useEffect(() => {
    if (!resource) {
      router.push('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  return (
    resource && (
      <DefaultLayout title={`${t(`${resource}:name_many`)} - ${process.env.NEXT_PUBLIC_APP_NAME}`}>
        <Main>
          <Header>
            <span className="flex flex-row gap-16">
              <h1 className="leading-h4-sm">{capitalize(t(`${resource}:name_many`))}</h1>
              {loading && <Spinner size={2.5} className="leading-h4-sm" />}
            </span>
            <ListToolbar resource={resource} onRefresh={refresh} properties={properties} />
          </Header>
          {children}
        </Main>
      </DefaultLayout>
    )
  );
};

export default ListLayout;
