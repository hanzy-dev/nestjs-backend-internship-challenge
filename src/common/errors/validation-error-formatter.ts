import { ValidationError } from 'class-validator';
import {
  ValidationErrorDetails,
  ValidationFieldError,
} from './validation-error-details';

export function formatValidationErrors(
  errors: ValidationError[],
): ValidationErrorDetails {
  const fields = errors.flatMap((error) => flattenValidationError(error));

  fields.sort((left, right) => left.field.localeCompare(right.field));

  return { fields };
}

function flattenValidationError(
  error: ValidationError,
  parentPath?: string,
): ValidationFieldError[] {
  const field = parentPath ? `${parentPath}.${error.property}` : error.property;
  const messages = Object.values(error.constraints ?? {}).sort();
  const current = messages.length > 0 ? [{ field, messages }] : [];
  const children = (error.children ?? []).flatMap((child) =>
    flattenValidationError(child, field),
  );

  return [...current, ...children];
}
