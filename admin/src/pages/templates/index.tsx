import { ListResources } from '@components/list-resources/list-resources';
import resources from '@config/resources';
import ListLayout from '@layouts/list-layout/list-layout.component';
import { Template } from '@services/templating/templating-service';
import { AutoTable, AutoTableHeader, Button, FormLabel, Icon, Input } from '@sk-web-gui/react';
import { getFormattedFields } from '@utils/formatted-field';
import { useResource } from '@utils/use-resource';
import { Pencil } from 'lucide-react';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo, useState } from 'react';
import NextLink from 'next/link';
import { useTranslation } from 'react-i18next';

export const Templates: React.FC = () => {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState<string>('');
  const [fetchedTemplate, setFetchedTemplate] = useState<Template>();

  const resource = 'templates';
  const properties = ['identifier', 'name', 'description', 'version'];

  const { getOne } = resources[resource];
  const { data, loaded } = useResource(resource);

  const getTemplate = (identifier: string) => {
    getOne(identifier).then((res) => {
      setFetchedTemplate(res.data.data as Template);
    });
  };

  const editHeader: AutoTableHeader = {
    label: 'edit',
    property: 'identifier',
    isColumnSortable: false,
    screenReaderOnly: true,
    sticky: true,
    renderColumn: (value) => (
      <div className="text-right w-full">
        <NextLink href={`/${resource}/${value}`} aria-label="Redigera">
          <Icon.Padded icon={<Pencil />} variant="tertiary" className="link-btn" />
        </NextLink>
      </div>
    ),
  };

  const translatedHeaders: AutoTableHeader[] =
    properties?.map((header) => ({
      label: t(`${resource}:properties.${header}`, { defaultValue: header }),
      property: header,
    })) || [];

  const autoHeaders = [...translatedHeaders, editHeader];

  const formattedFetchedTemplate = useMemo(
    () => (fetchedTemplate ? [getFormattedFields(fetchedTemplate)] : []),
    [fetchedTemplate]
  );

  return (
    <ListLayout resource={resource} properties={properties}>
      {loaded && <ListResources resource={resource} data={data} properties={properties} editProperty="identifier" />}
      <FormLabel className="mt-16">Hämta mall med identifierare</FormLabel>
      <div className="flex flex-row gap-8 my-16">
        <Input onChange={(e) => setIdentifier(e.target.value)} className="w-[40rem]" />
        <Button onClick={() => getTemplate(identifier)}>Hämta mall</Button>
      </div>
      {!!fetchedTemplate && <AutoTable pageSize={1} autodata={formattedFetchedTemplate} autoheaders={autoHeaders} />}
    </ListLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'layout', 'crud', ...Object.keys(resources)])),
  },
});

export default Templates;
