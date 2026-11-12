import { Matches } from 'class-validator';

export class UserOpHashParamDto {
  @Matches(/^0x[0-9a-fA-F]{64}$/)
  userOpHash!: string;
}
