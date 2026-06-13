import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ContractProfileDto {
  @IsEmail()
  email!: string;
}

export class ContractRequestDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;

  @ValidateNested()
  @Type(() => ContractProfileDto)
  profile!: ContractProfileDto;
}
