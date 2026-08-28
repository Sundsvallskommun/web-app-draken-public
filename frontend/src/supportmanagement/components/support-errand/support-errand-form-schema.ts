import { appConfig } from '@config/appconfig';
import { getSupportErrandClassificationPlacement } from '@supportmanagement/investigation/investigation-classification-ownership';
import * as yup from 'yup';

import {
  resolveCategorizationControl,
  resolveCategorizationMode,
} from '../support-errand-basics-form/categorization-control';

/**
 * Grundinformation renders no categorization control when the investigation document owns
 * classification. Requiring the fields there anyway would leave the form invalid - and the save
 * button disabled - with no field on screen to fill in and no error message to explain it.
 */
const rendersCategorizationControl = (): boolean =>
  resolveCategorizationControl(resolveCategorizationMode(appConfig.features), getSupportErrandClassificationPlacement())
    .kind !== 'none';

const requiredWhenRendered = (message: string) =>
  yup.string().test('required-when-rendered', message, (value) => !rendersCategorizationControl() || !!value);

export const supportErrandFormSchema = yup
  .object({
    id: yup.string(),
    category: requiredWhenRendered('Välj ärendekategori'),
    type: requiredWhenRendered('Välj ärendetyp'),
    subType: yup.string().when('classificationHasSubTypes', {
      is: true,
      then: (schema) =>
        schema.test(
          'required-when-rendered',
          'Välj underkategori',
          (value) => !rendersCategorizationControl() || !!value
        ),
    }),
    classificationHasSubTypes: yup.boolean(),
    channel: yup.string().required('Välj kanal'),
    description: yup.string(),
    parameters: yup.array(),
  })
  .required();
