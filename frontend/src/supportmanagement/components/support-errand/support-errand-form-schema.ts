import * as yup from 'yup';

export const supportErrandFormSchema = yup
  .object({
    id: yup.string(),
    category: yup.string().required('Välj ärendekategori'),
    type: yup.string().required('Välj ärendetyp'),
    subType: yup.string().when('classificationHasSubTypes', {
      is: true,
      then: (schema) => schema.required('Välj underkategori'),
    }),
    classificationHasSubTypes: yup.boolean(),
    channel: yup.string().required('Välj kanal'),
    description: yup.string(),
    parameters: yup.array(),
  })
  .required();
