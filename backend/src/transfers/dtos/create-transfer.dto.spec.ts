import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransferDto } from './create-transfer.dto';

const valid = {
  userAddress: '0x1111111111111111111111111111111111111111',
  token: '0x2222222222222222222222222222222222222222',
  to: '0x3333333333333333333333333333333333333333',
  amount: '1000000',
};

const errorsFor = (overrides: Record<string, unknown>) =>
  validate(plainToInstance(CreateTransferDto, { ...valid, ...overrides }));

describe('CreateTransferDto', () => {
  it('accepts a decimal string amount', async () => {
    expect(await errorsFor({})).toHaveLength(0);
  });

  it.each([
    ['a JSON number', 1000000],
    ['zero', '0'],
    ['a negative value', '-5'],
    ['a decimal', '1.5'],
    ['a leading zero', '01'],
  ])('rejects amount as %s', async (_label, amount) => {
    expect((await errorsFor({ amount })).map((e) => e.property)).toContain('amount');
  });

  it('rejects a malformed address', async () => {
    expect((await errorsFor({ to: '0x123' })).map((e) => e.property)).toContain('to');
  });
});
