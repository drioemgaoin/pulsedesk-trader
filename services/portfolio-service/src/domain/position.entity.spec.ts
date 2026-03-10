import { Position } from './position.entity';
import { OrderSide } from './enums/order-side.enum';
import { PositionValidationError } from './errors/position-validation.error';

describe('Given a first BUY fill', () => {
  describe('when Position.open is called', () => {
    it('should create position with correct quantity and averageCost equal to fillPrice', () => {
      const position = Position.open('pos-1', 'acc-001', 'AAPL', OrderSide.BUY, 10, 150);
      expect(position.quantity).toBe(10);
      expect(position.averageCost).toBe(150);
      expect(position.accountId).toBe('acc-001');
      expect(position.symbol).toBe('AAPL');
    });
  });
});

describe('Given invalid quantity (<= 0)', () => {
  describe('when Position.open is called', () => {
    it('should throw PositionValidationError', () => {
      expect(() => Position.open('pos-1', 'acc-001', 'AAPL', OrderSide.BUY, 0, 150))
        .toThrow(PositionValidationError);
    });
  });
});

describe('Given invalid fillPrice (<= 0)', () => {
  describe('when Position.open is called', () => {
    it('should throw PositionValidationError', () => {
      expect(() => Position.open('pos-1', 'acc-001', 'AAPL', OrderSide.BUY, 10, 0))
        .toThrow(PositionValidationError);
    });
  });
});

describe('Given an existing BUY position (qty=10, avgCost=100)', () => {
  describe('when applyFill BUY (qty=10, price=120)', () => {
    it('should return new position with qty=20 and avgCost=110', () => {
      const position = new Position({ id: 'pos-1', accountId: 'acc-001', symbol: 'AAPL', quantity: 10, averageCost: 100, updatedAt: '' });
      const updated = position.applyFill(OrderSide.BUY, 10, 120);
      expect(updated.quantity).toBe(20);
      expect(updated.averageCost).toBe(110);
    });
  });
});

describe('Given an existing position (qty=10, avgCost=100)', () => {
  describe('when applyFill SELL (qty=5, price=anything)', () => {
    it('should return qty=5 with avgCost=100 unchanged', () => {
      const position = new Position({ id: 'pos-1', accountId: 'acc-001', symbol: 'AAPL', quantity: 10, averageCost: 100, updatedAt: '' });
      const updated = position.applyFill(OrderSide.SELL, 5, 200);
      expect(updated.quantity).toBe(5);
      expect(updated.averageCost).toBe(100);
    });
  });
});

describe('Given an existing position (qty=5)', () => {
  describe('when applyFill SELL (qty=10, price=anything)', () => {
    it('should return qty=0 and avgCost=0 (position closed)', () => {
      const position = new Position({ id: 'pos-1', accountId: 'acc-001', symbol: 'AAPL', quantity: 5, averageCost: 100, updatedAt: '' });
      const updated = position.applyFill(OrderSide.SELL, 10, 200);
      expect(updated.quantity).toBe(0);
      expect(updated.averageCost).toBe(0);
    });
  });
});

describe('Given a position (qty=10, avgCost=100)', () => {
  describe('when unrealizedPnl(110) is called', () => {
    it('should return 100', () => {
      const position = new Position({ id: 'pos-1', accountId: 'acc-001', symbol: 'AAPL', quantity: 10, averageCost: 100, updatedAt: '' });
      expect(position.unrealizedPnl(110)).toBe(100);
    });
  });
});
