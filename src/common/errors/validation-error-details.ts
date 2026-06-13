export interface ValidationFieldError {
  field: string;
  messages: string[];
}

export interface ValidationErrorDetails extends Record<string, unknown> {
  fields: ValidationFieldError[];
}
