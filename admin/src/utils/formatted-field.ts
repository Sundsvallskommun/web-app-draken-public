import { dateFields } from '@config/defaults';
import dayjs from 'dayjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GetFormattedFields = (object: Record<string | number, any>, deep?: boolean) => Record<string | number, any>;

export const getFormattedFields: GetFormattedFields = (object, deep) => {
  return Object.keys(object).reduce((newObject, key) => {
    if (typeof object[key] === 'object') {
      return { ...newObject, [key]: deep ? getFormattedFields(object[key], true) : object[key] };
    }
    if (dateFields.includes(key)) {
      const date = dayjs(new Date(object[key])).format('YYYY-MM-DD, H:mm');
      return { ...newObject, [key]: date };
    }
    return { ...newObject, [key]: object[key] };
  }, {});
};
