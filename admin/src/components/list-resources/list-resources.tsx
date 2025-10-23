import { defaultInformationFields } from '@config/defaults';
import resources from '@config/resources';
import { ResourceName } from '@interfaces/resource-name';
import { AutoTable, AutoTableHeader, Icon } from '@sk-web-gui/react';
import { getFormattedFields } from '@utils/formatted-field';
import { useLocalStorage } from '@utils/use-localstorage.hook';
import { Check, Pencil } from 'lucide-react';
import NextLink from 'next/link';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { capitalize } from 'underscore.string';
import { useShallow } from 'zustand/react/shallow';

interface ListResourcesProps {
  properties?: string[];
  resource: ResourceName;
  headers?: AutoTableHeader[];
  data?: Array<Record<string, unknown>>;
  editProperty?: string;
}

export const ListResources: React.FC<ListResourcesProps> = ({
  properties,
  resource,
  headers: _headers,
  data,
  editProperty = 'id',
}) => {
  const { update } = resources[resource];
  const { t } = useTranslation();
  const [{ [resource]: storeHeaders }, setHeaders] = useLocalStorage(
    useShallow((state) => [state.headers, state.setHeaders])
  );

  useEffect(() => {
    if (!storeHeaders && data) {
      const newHeaders = properties ?? [
        ...(data?.[0] ? Object.keys(data[0]).filter((field) => typeof data[0][field] !== 'object') : []),
        ...(defaultInformationFields || ['id']),
      ];
      setHeaders({
        [resource]: newHeaders,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeHeaders, data, properties]);

  const headers = useMemo(
    () =>
      _headers ||
      storeHeaders?.reduce<AutoTableHeader[]>((headers, key) => {
        if (data) {
          const type = typeof data?.[0]?.[key];
          switch (type) {
            case 'string':
              return [
                ...headers,
                {
                  label: capitalize(
                    t(`${defaultInformationFields.includes(key) ? 'common:' : `${resource}:properties.`}${key}`)
                  ),
                  property: key,
                },
              ];
            case 'number':
              return [
                ...headers,
                {
                  label: capitalize(
                    t(`${defaultInformationFields.includes(key) ? 'common:' : `${resource}:properties.`}${key}`)
                  ),
                  property: key,
                },
              ];
            case 'boolean':
              return [
                ...headers,
                {
                  label: capitalize(
                    t(`${defaultInformationFields.includes(key) ? 'common:' : `${resource}:properties.`}${key}`)
                  ),
                  property: key,
                  renderColumn: (value) => (
                    <span>{value && <Icon.Padded rounded color="success" icon={<Check />} />}</span>
                  ),
                  isColumnSortable: false,
                },
              ];
            default:
              return headers;
          }
        } else {
          return headers;
        }
      }, []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeHeaders, _headers, data]
  );

  const editHeader: AutoTableHeader = {
    label: 'edit',
    property: editProperty,
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
    headers?.map((header) =>
      typeof header === 'object' ?
        { ...header, label: header?.label || capitalize(t(`${resource}:properties.${header}`)) }
      : {
          label: t(`${resource}:properties.${header}`, { defaultValue: header }),
          property: header,
        }
    ) || [];

  const formattedData = useMemo(() => data?.map((row) => getFormattedFields(row)), [data]);

  const autoHeaders = [...translatedHeaders, ...(update ? [editHeader] : [])];

  return (
    <div>
      {formattedData && formattedData?.length > 0 ?
        <AutoTable
          pageSize={15}
          autodata={formattedData}
          autoheaders={autoHeaders.filter(
            (header, index) =>
              autoHeaders.map((head) => head.label).indexOf(header.label) === index &&
              Object.keys(formattedData[0]).includes(header.property as string)
          )}
        />
      : <h3>{capitalize(t('common:no_resources', { resources: t(`${resource}:name_zero`) }))}</h3>}
    </div>
  );
};
