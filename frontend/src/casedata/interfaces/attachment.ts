import { GenericExtraParameters } from './extra-parameters';

export interface Attachment {
  id?: string;
  version?: number;
  created?: string;
  updated?: string;
  category: string;
  name: string;
  note: string;
  extension: string;
  mimeType: string;
  file: string;
  extraParameters?: GenericExtraParameters;
}
