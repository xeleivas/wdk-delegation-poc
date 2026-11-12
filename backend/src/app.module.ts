import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { baseConfig } from './config/base.config';
import { TransfersModule } from './transfers/transfers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [baseConfig], envFilePath: ['.env', '../.env'] }),
    TransfersModule,
  ],
})
export class AppModule {}
