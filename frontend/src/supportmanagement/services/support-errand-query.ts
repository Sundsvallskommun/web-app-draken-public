export type SupportErrandFilterValue = string | boolean | number;
export type SupportErrandFilterQuery = Readonly<Record<string, SupportErrandFilterValue>>;
export type SupportErrandSortQuery = Readonly<Record<string, 'asc' | 'desc'>>;

const appendFilter = (parameters: URLSearchParams, filter: SupportErrandFilterQuery): void => {
  Object.entries(filter).forEach(([key, value]) => parameters.append(key, String(value)));
};

export const buildSupportErrandsSearchParameters = (
  page: number,
  size: number,
  filter: SupportErrandFilterQuery,
  sort: SupportErrandSortQuery
): string => {
  const parameters = new URLSearchParams({ page: String(page), size: String(size) });
  appendFilter(parameters, filter);
  Object.entries(sort).forEach(([key, direction]) => parameters.append('sort', `${key},${direction}`));
  return parameters.toString();
};

export const buildSupportErrandsCountSearchParameters = (filter: SupportErrandFilterQuery): string => {
  const parameters = new URLSearchParams();
  appendFilter(parameters, filter);
  return parameters.toString();
};
