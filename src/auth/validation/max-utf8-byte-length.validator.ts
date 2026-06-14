import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function MaxUtf8ByteLength(
  maxBytes: number,
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'maxUtf8ByteLength',
      target: target.constructor,
      propertyName: propertyName.toString(),
      constraints: [maxBytes],
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value !== 'string' ||
            Buffer.byteLength(value, 'utf8') <= maxBytes
          );
        },
        defaultMessage(arguments_: ValidationArguments): string {
          return `${arguments_.property} must be no longer than ${maxBytes} UTF-8 bytes`;
        },
      },
    });
  };
}
