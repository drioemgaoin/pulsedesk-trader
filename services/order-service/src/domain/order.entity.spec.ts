import { Order } from './order.entity';
import { OrderSide } from './enums/order-side.enum';
import { OrderStatus } from './enums/order-status.enum';
import { OrderType } from './enums/order-type.enum';
import { OrderValidationError } from './errors/order-validation.error';

const VALID_LIMIT_PARAMS = {
  id: 'id-1',
  commandId: 'cmd-1',
  accountId: 'acc-001',
  symbol: 'AAPL',
  side: OrderSide.BUY,
  type: OrderType.LIMIT,
  quantity: 10,
  limitPrice: 150,
};

describe('Given valid LIMIT order parameters', () => {
  describe('when Order.create is called', () => {
    it('should create an order with PENDING status', () => {
      const o = Order.create(VALID_LIMIT_PARAMS);
      expect(o.status).toBe(OrderStatus.PENDING);
    });

    it('should preserve the provided symbol, quantity and limitPrice', () => {
      const o = Order.create(VALID_LIMIT_PARAMS);
      expect(o.symbol).toBe('AAPL');
      expect(o.quantity).toBe(10);
      expect(o.limitPrice).toBe(150);
    });

    it('should normalise the symbol to uppercase', () => {
      const o = Order.create({ ...VALID_LIMIT_PARAMS, symbol: 'aapl' });
      expect(o.symbol).toBe('AAPL');
    });
  });
});

describe('Given valid MARKET order parameters', () => {
  describe('when Order.create is called without a limitPrice', () => {
    it('should create an order with null limitPrice', () => {
      const o = Order.create({ ...VALID_LIMIT_PARAMS, type: OrderType.MARKET, limitPrice: undefined });
      expect(o.limitPrice).toBeNull();
    });
  });
});

describe('Given invalid order parameters', () => {
  describe('when Order.create is called with an empty symbol', () => {
    it('should throw OrderValidationError', () => {
      expect(() => Order.create({ ...VALID_LIMIT_PARAMS, symbol: '' })).toThrow(OrderValidationError);
    });
  });

  describe('when Order.create is called with zero quantity', () => {
    it('should throw OrderValidationError', () => {
      expect(() => Order.create({ ...VALID_LIMIT_PARAMS, quantity: 0 })).toThrow(OrderValidationError);
    });
  });

  describe('when Order.create is called with negative quantity', () => {
    it('should throw OrderValidationError', () => {
      expect(() => Order.create({ ...VALID_LIMIT_PARAMS, quantity: -1 })).toThrow(OrderValidationError);
    });
  });

  describe('when Order.create is called with a LIMIT type but no limitPrice', () => {
    it('should throw OrderValidationError', () => {
      expect(() => Order.create({ ...VALID_LIMIT_PARAMS, limitPrice: undefined })).toThrow(OrderValidationError);
    });
  });

  describe('when Order.create is called with a LIMIT type and zero limitPrice', () => {
    it('should throw OrderValidationError', () => {
      expect(() => Order.create({ ...VALID_LIMIT_PARAMS, limitPrice: 0 })).toThrow(OrderValidationError);
    });
  });

  describe('when Order.create is called with a MARKET type and a limitPrice set', () => {
    it('should throw OrderValidationError', () => {
      expect(() => Order.create({ ...VALID_LIMIT_PARAMS, type: OrderType.MARKET, limitPrice: 100 })).toThrow(OrderValidationError);
    });
  });
});

describe('Given a PENDING order', () => {
  describe('when accept() is called', () => {
    it('should return an order with ACCEPTED status', () => {
      const o = Order.create(VALID_LIMIT_PARAMS).accept();
      expect(o.status).toBe(OrderStatus.ACCEPTED);
    });

    it('should not mutate the original order', () => {
      const original = Order.create(VALID_LIMIT_PARAMS);
      const accepted = original.accept();
      expect(original.status).toBe(OrderStatus.PENDING);
      expect(accepted.status).toBe(OrderStatus.ACCEPTED);
    });
  });

  describe('when reject() is called with a reason', () => {
    it('should return an order with REJECTED status and the rejection reason', () => {
      const o = Order.create(VALID_LIMIT_PARAMS).reject('position limit exceeded');
      expect(o.status).toBe(OrderStatus.REJECTED);
      expect(o.rejectionReason).toBe('position limit exceeded');
    });
  });
});
