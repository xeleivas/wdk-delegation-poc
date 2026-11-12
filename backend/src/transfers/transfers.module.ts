import { Module } from '@nestjs/common';
import { TransfersClients } from './transfers-clients';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  controllers: [TransfersController],
  providers: [TransfersClients, TransfersService],
})
export class TransfersModule {}
