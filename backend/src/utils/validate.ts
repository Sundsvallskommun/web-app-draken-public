import { ValidationError, validate } from 'class-validator';

import { HttpException } from '@exceptions/HttpException';
import { plainToInstance } from 'class-transformer';

export const getAllNestedErrors = (error: ValidationError) => {
  if (error.constraints) {
    return Object.values(error.constraints);
  }
  return error.children.map(getAllNestedErrors).join(',');
};

/**
 * @param schema Should be a `class-validator` object
 * @param data should be the object to validate
 * @param skipMissingProperties
 * @param whitelist
 * @param forbidNonWhitelisted
 * @returns ValidationError[]
 */
export const validateObject = async (
  schema: any,
  data: any,
  skipMissingProperties = false,
  whitelist = true,
  forbidNonWhitelisted = true,
): Promise<ValidationError[]> => {
  const obj = plainToInstance(schema, data);
  return await validate(obj, { skipMissingProperties, whitelist, forbidNonWhitelisted });
};
/**
 * Validate body against class-validator, will throw `HttpException` on errors
 * @param schema Should be a `class-validator` object
 * @param body should be the object to validate
 */
export const validateRequestBody = async (schema, body) => {
  const errors = await validateObject(schema, body);
  if (errors.length > 0) {
    const message = errors.map(getAllNestedErrors).join(', ');
    throw new HttpException(400, message);
  }
};
