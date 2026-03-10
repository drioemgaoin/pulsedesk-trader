import { Execution } from './execution.entity';
import { OrderSide } from './enums/order-side.enum';
import { ExecutionValidationError } from './errors/execution-validation.error';

const VALID_PARAMS = {
  id: 'exec-1',
  idempotencyKey: 'order-1',
  orderId: 'order-1',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  filledQuantity: 10,
  fillPrice: 150,
  filledAt: '2026-03-10T00:00:00.000Z',
};

describe('Given valid execution parameters', () => {
  describe('when Execution.create is called', () => {
    it('should return an Execution with all fields set', () => {
      const exec = Execution.create(VALID_PARAMS);
      expect(exec.id).toBe('exec-1');
      expect(exec.orderId).toBe('order-1');
      expect(exec.filledQuantity).toBe(10);
      expect(exec.fillPrice).toBe(150);
    });
  });
});

describe('Given an invalid filledQuantity', () => {
  describe('when Execution.create is called with quantity <= 0', () => {
    it('should throw ExecutionValidationError', () => {
      expect(() => Execution.create({ ...VALID_PARAMS, filledQuantity: 0 }))
        .toThrow(ExecutionValidationError);
    });
  });
});

describe('Given an invalid fillPrice', () => {
  describe('when Execution.create is called with fillPrice <= 0', () => {
    it('should throw ExecutionValidationError', () => {
      expect(() => Execution.create({ ...VALID_PARAMS, fillPrice: -1 }))
        .toThrow(ExecutionValidationError);
    });
  });
});
