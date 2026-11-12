import { IsEthereumAddress, IsString, Matches } from 'class-validator';

export class CreateTransferDto {
  @IsEthereumAddress()
  userAddress!: string;

  @IsEthereumAddress()
  token!: string;

  @IsEthereumAddress()
  to!: string;

  @IsString()
  @Matches(/^[1-9]\d*$/)
  amount!: string;
}
