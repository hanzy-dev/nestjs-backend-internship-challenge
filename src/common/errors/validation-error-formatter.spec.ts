import { ValidationError } from 'class-validator';
import { formatValidationErrors } from './validation-error-formatter';

describe('formatValidationErrors', () => {
  it('formats a single field without exposing its rejected value', () => {
    const error: ValidationError = {
      property: 'email',
      value: 'private-value',
      constraints: {
        isEmail: 'email must be an email',
      },
    };

    expect(formatValidationErrors([error])).toEqual({
      fields: [
        {
          field: 'email',
          messages: ['email must be an email'],
        },
      ],
    });
    expect(JSON.stringify(formatValidationErrors([error]))).not.toContain(
      'private-value',
    );
  });

  it('sorts fields and multiple messages deterministically', () => {
    const errors: ValidationError[] = [
      {
        property: 'name',
        constraints: {
          minLength: 'name is too short',
          isString: 'name must be a string',
        },
      },
      {
        property: 'email',
        constraints: {
          isEmail: 'email must be an email',
        },
      },
    ];

    expect(formatValidationErrors(errors)).toEqual({
      fields: [
        {
          field: 'email',
          messages: ['email must be an email'],
        },
        {
          field: 'name',
          messages: ['name is too short', 'name must be a string'],
        },
      ],
    });
  });

  it('flattens nested errors into dotted field paths', () => {
    const error: ValidationError = {
      property: 'profile',
      children: [
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email',
          },
        },
      ],
    };

    expect(formatValidationErrors([error])).toEqual({
      fields: [
        {
          field: 'profile.email',
          messages: ['email must be an email'],
        },
      ],
    });
  });

  it('returns no field entry when constraints are absent', () => {
    expect(
      formatValidationErrors([{ property: 'profile', children: [] }]),
    ).toEqual({ fields: [] });
  });
});
