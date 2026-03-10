/**
 * Integration spec — PrismaPositionRepository ↔ PostgreSQL
 *
 * Scope: verifies that the repository correctly persists and retrieves
 * Position aggregates and enforces idempotency via the processed_fills
 * table.  Tests run against a mocked PrismaService; a fully live
 * Postgres stack is covered by the docker-compose E2E suite.
 *
 * Style: describe('<component>') > describe('when <scenario>') > it('should <outcome>')
 */

import { PrismaPositionRepository } from './prisma-position.repository';
import { Position } from '../../domain/position.entity';
import { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePosition = (overrides: Partial<{
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
}> = {}): Position =>
  new Position({
    id: overrides.id ?? 'pos-uuid-1',
    accountId: overrides.accountId ?? 'acc-001',
    symbol: overrides.symbol ?? 'AAPL',
    quantity: overrides.quantity ?? 10,
    averageCost: overrides.averageCost ?? 150,
    updatedAt: '2026-03-10T00:00:00.000Z',
  });

const makeDecimal = (value: number) => ({ toNumber: () => value });

const makeDbRecord = (overrides: Partial<{
  id: string;
  accountId: string;
  symbol: string;
  quantity: number;
  averageCost: number;
  updatedAt: Date;
}> = {}) => ({
  id: overrides.id ?? 'pos-uuid-1',
  accountId: overrides.accountId ?? 'acc-001',
  symbol: overrides.symbol ?? 'AAPL',
  quantity: makeDecimal(overrides.quantity ?? 10),
  averageCost: makeDecimal(overrides.averageCost ?? 150),
  updatedAt: overrides.updatedAt ?? new Date('2026-03-10T00:00:00.000Z'),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeMockPrisma = (overrides: Record<string, unknown> = {}): any => ({
  position: {
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue({}),
    ...((overrides['position'] as object | undefined) ?? {}),
  },
  processedFill: {
    create: jest.fn().mockResolvedValue({}),
    ...((overrides['processedFill'] as object | undefined) ?? {}),
  },
  $transaction: jest.fn(),
  ...(overrides['root'] as object | undefined),
});

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('PrismaPositionRepository', () => {
  // -------------------------------------------------------------------------
  // findByAccountAndSymbol
  // -------------------------------------------------------------------------

  describe('when findByAccountAndSymbol is called for a known account/symbol pair', () => {
    it('should return the mapped Position domain object', async () => {
      const dbRecord = makeDbRecord();
      const mockPrisma = makeMockPrisma();
      mockPrisma.position.findUnique.mockResolvedValue(dbRecord);

      const repo = new PrismaPositionRepository(mockPrisma);
      const result = await repo.findByAccountAndSymbol('acc-001', 'AAPL');

      expect(result).not.toBeNull();
      expect(result!.accountId).toBe('acc-001');
      expect(result!.symbol).toBe('AAPL');
      expect(result!.quantity).toBe(10);
      expect(result!.averageCost).toBe(150);
      expect(mockPrisma.position.findUnique).toHaveBeenCalledWith({
        where: { accountId_symbol: { accountId: 'acc-001', symbol: 'AAPL' } },
      });
    });
  });

  describe('when findByAccountAndSymbol is called for an unknown account/symbol pair', () => {
    it('should return null', async () => {
      const mockPrisma = makeMockPrisma();
      mockPrisma.position.findUnique.mockResolvedValue(null);

      const repo = new PrismaPositionRepository(mockPrisma);
      const result = await repo.findByAccountAndSymbol('acc-999', 'UNKNOWN');

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // findAllByAccount
  // -------------------------------------------------------------------------

  describe('when findAllByAccount is called for an account with multiple positions', () => {
    it('should return all mapped Position objects for that account', async () => {
      const records = [
        makeDbRecord({ symbol: 'AAPL', quantity: 10, averageCost: 150 }),
        makeDbRecord({ id: 'pos-uuid-2', symbol: 'TSLA', quantity: 5, averageCost: 200 }),
      ];
      const mockPrisma = makeMockPrisma();
      mockPrisma.position.findMany.mockResolvedValue(records);

      const repo = new PrismaPositionRepository(mockPrisma);
      const results = await repo.findAllByAccount('acc-001');

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('AAPL');
      expect(results[1].symbol).toBe('TSLA');
      expect(mockPrisma.position.findMany).toHaveBeenCalledWith({ where: { accountId: 'acc-001' } });
    });
  });

  describe('when findAllByAccount is called for an account with no positions', () => {
    it('should return an empty array', async () => {
      const mockPrisma = makeMockPrisma();
      mockPrisma.position.findMany.mockResolvedValue([]);

      const repo = new PrismaPositionRepository(mockPrisma);
      const results = await repo.findAllByAccount('acc-empty');

      expect(results).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // savePositionWithFill — happy path
  // -------------------------------------------------------------------------

  describe('when savePositionWithFill is called with a new position and a fresh executionId', () => {
    it('should execute a transaction, upsert the position, and return SAVED', async () => {
      const position = makePosition();
      const mockTx = {
        processedFill: { create: jest.fn().mockResolvedValue({}) },
        position: { upsert: jest.fn().mockResolvedValue({}) },
      };
      const mockPrisma = makeMockPrisma();
      mockPrisma.$transaction.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fn: (tx: typeof mockTx) => Promise<any>) => fn(mockTx),
      );

      const repo = new PrismaPositionRepository(mockPrisma);
      const result = await repo.savePositionWithFill(position, 'exec-001');

      expect(result).toBe('SAVED');
      expect(mockTx.processedFill.create).toHaveBeenCalledWith({ data: { executionId: 'exec-001' } });
      expect(mockTx.position.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { accountId_symbol: { accountId: 'acc-001', symbol: 'AAPL' } },
          create: expect.objectContaining({ quantity: 10, averageCost: 150 }),
          update: expect.objectContaining({ quantity: 10, averageCost: 150 }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // savePositionWithFill — duplicate detection (P2002)
  // -------------------------------------------------------------------------

  describe('when savePositionWithFill is called with a previously processed executionId', () => {
    it('should catch the P2002 unique constraint error and return DUPLICATE', async () => {
      const position = makePosition();
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.4.2', meta: {} },
      );
      const mockPrisma = makeMockPrisma();
      mockPrisma.$transaction.mockRejectedValue(p2002Error);

      const repo = new PrismaPositionRepository(mockPrisma);
      const result = await repo.savePositionWithFill(position, 'exec-dup-001');

      expect(result).toBe('DUPLICATE');
    });
  });

  // -------------------------------------------------------------------------
  // savePositionWithFill — unexpected DB error propagation
  // -------------------------------------------------------------------------

  describe('when savePositionWithFill encounters an unexpected database error', () => {
    it('should rethrow the error so the caller can handle it', async () => {
      const position = makePosition();
      const mockPrisma = makeMockPrisma();
      mockPrisma.$transaction.mockRejectedValue(new Error('connection refused'));

      const repo = new PrismaPositionRepository(mockPrisma);

      await expect(repo.savePositionWithFill(position, 'exec-err-001')).rejects.toThrow('connection refused');
    });
  });

  // -------------------------------------------------------------------------
  // Decimal precision mapping
  // -------------------------------------------------------------------------

  describe('when a position record has high-precision Decimal values from the DB', () => {
    it('should map quantity and averageCost via toNumber() preserving fractional precision', async () => {
      const highPrecisionRecord = {
        ...makeDbRecord(),
        quantity: makeDecimal(3.12345678),
        averageCost: makeDecimal(99.87654321),
      };
      const mockPrisma = makeMockPrisma();
      mockPrisma.position.findUnique.mockResolvedValue(highPrecisionRecord);

      const repo = new PrismaPositionRepository(mockPrisma);
      const result = await repo.findByAccountAndSymbol('acc-001', 'AAPL');

      expect(result!.quantity).toBeCloseTo(3.12345678, 8);
      expect(result!.averageCost).toBeCloseTo(99.87654321, 8);
    });
  });

  // -------------------------------------------------------------------------
  // Atomicity: processedFill.create must precede position.upsert inside tx
  // -------------------------------------------------------------------------

  describe('when savePositionWithFill executes the transaction', () => {
    it('should create processedFill before upserting position within the same transaction', async () => {
      const position = makePosition();
      const callOrder: string[] = [];

      const mockTx = {
        processedFill: {
          create: jest.fn().mockImplementation(() => {
            callOrder.push('processedFill.create');
            return Promise.resolve({});
          }),
        },
        position: {
          upsert: jest.fn().mockImplementation(() => {
            callOrder.push('position.upsert');
            return Promise.resolve({});
          }),
        },
      };
      const mockPrisma = makeMockPrisma();
      mockPrisma.$transaction.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fn: (tx: typeof mockTx) => Promise<any>) => fn(mockTx),
      );

      const repo = new PrismaPositionRepository(mockPrisma);
      await repo.savePositionWithFill(position, 'exec-order-test');

      expect(callOrder).toEqual(['processedFill.create', 'position.upsert']);
    });
  });
});
