import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { ContractRequestDto } from './api-contract.dto';
import { SerializedContract } from './serialized-contract';

@Controller('contract')
export class ApiContractController {
  @Post('validate')
  validate(@Body() body: ContractRequestDto): ContractRequestDto {
    return body;
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundException('Contract fixture not found');
  }

  @Get('conflict')
  conflict(): never {
    throw new ConflictException('Contract fixture conflict');
  }

  @Get('unexpected')
  unexpected(): never {
    throw new Error('Private fixture failure');
  }

  @Get('serialized')
  serialized(): SerializedContract {
    return new SerializedContract();
  }
}
