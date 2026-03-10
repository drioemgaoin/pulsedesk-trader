import { BadRequestException } from '@nestjs/common';
import { TicksController } from './ticks.controller';
import { NormalizeTickUseCase } from '../../application/normalize-tick.use-case';
import { ProcessTickUseCase } from '../../application/process-tick.use-case';
import { Tick } from '../../domain/tick';

const VALID_RAW = {
  symbol: 'AAPL',
  bid: 174.99,
  ask: 175.01,
  last: 175.0,
  volume: 1000,
};

describe('Given a TicksController instance', () => {
  const makeNormalize = (result: Tick | null) =>
    ({ execute: jest.fn().mockReturnValue(result) } as unknown as NormalizeTickUseCase);
  const makeProcess = () =>
    ({ execute: jest.fn().mockResolvedValue(undefined) } as unknown as ProcessTickUseCase);

  describe('when ingest is called with a valid tick payload', () => {
    it('should return { accepted: true }', async () => {
      const tick = Tick.create(VALID_RAW);
      const ctrl = new TicksController(makeNormalize(tick), makeProcess());
      const result = await ctrl.ingest(VALID_RAW);
      expect(result).toEqual({ accepted: true });
    });

    it('should forward the normalised tick to the process use case', async () => {
      const tick = Tick.create(VALID_RAW);
      const proc = makeProcess();
      const ctrl = new TicksController(makeNormalize(tick), proc);
      await ctrl.ingest(VALID_RAW);
      expect(proc.execute).toHaveBeenCalledWith(tick);
    });
  });

  describe('when ingest is called with an invalid tick payload', () => {
    it('should throw BadRequestException when normalization returns null', async () => {
      const ctrl = new TicksController(makeNormalize(null), makeProcess());
      await expect(ctrl.ingest({ symbol: '' })).rejects.toThrow(BadRequestException);
    });
  });
});
