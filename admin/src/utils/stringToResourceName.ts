import resources from '@config/resources';
import { ResourceName } from '@interfaces/resource-name';

export const stringToResourceName = (string: string): ResourceName | undefined => {
  const isResource = Object.keys(resources).includes(string);
  return isResource ? (string as ResourceName) : undefined;
};
