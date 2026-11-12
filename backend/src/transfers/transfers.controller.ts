import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { Address, Hex } from 'viem';
import { AddressParamDto } from './dtos/address-param.dto';
import { CreateTransferDto } from './dtos/create-transfer.dto';
import { UserOpHashParamDto } from './dtos/user-op-hash-param.dto';
import { DelegationStatus, TransferStatus, TransfersService } from './transfers.service';

@Controller()
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post('transfers')
  createTransfer(@Body() dto: CreateTransferDto): Promise<{ userOpHash: Hex }> {
    return this.transfersService.createTransfer(dto);
  }

  @Get('transfers/:userOpHash')
  getTransfer(@Param() params: UserOpHashParamDto): Promise<TransferStatus> {
    return this.transfersService.getTransfer(params.userOpHash as Hex);
  }

  @Get('delegations/:userAddress')
  getDelegation(@Param() params: AddressParamDto): Promise<DelegationStatus> {
    return this.transfersService.getDelegation(params.userAddress as Address);
  }
}
