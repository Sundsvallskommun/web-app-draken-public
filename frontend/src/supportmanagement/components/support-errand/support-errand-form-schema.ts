import { basicsAcceptsClassification } from '@supportmanagement/investigation/investigation-classification-ownership';
import * as yup from 'yup';

/**
 * Grundinformation cannot always give the errand a classification: the investigation document owns
 * it, or that capability is unavailable and the control is read-only. Requiring the fields anyway
 * would leave the form invalid - and "Spara ärende" disabled for every other edit, stakeholders
 * included - with nothing on screen the user is allowed to fill in. The errand PATCH leaves
 * classification alone in both cases, so nothing is lost by not asking for it.
 */
const requiredWhenClassifiable = (message: string) =>
  yup.string().test('required-when-classifiable', message, (value) => !basicsAcceptsClassification() || !!value);

export const supportErrandFormSchema = yup
  .object({
    id: yup.string(),
    category: requiredWhenClassifiable('Välj ärendekategori'),
    type: requiredWhenClassifiable('Välj ärendetyp'),
    subType: yup.string().when('classificationHasSubTypes', {
      is: true,
      then: (schema) =>
        schema.test(
          'required-when-classifiable',
          'Välj underkategori',
          (value) => !basicsAcceptsClassification() || !!value
        ),
    }),
    classificationHasSubTypes: yup.boolean(),
    channel: yup.string().required('Välj kanal'),
    description: yup.string(),
    parameters: yup.array(),
  })
  .required();
