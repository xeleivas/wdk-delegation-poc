import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { pocConfig } from './config/poc.config';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [pocConfig], envFilePath: ['.env', '../.env'] }),
    TransfersModule,
  ],
})
export class AppModule {}
