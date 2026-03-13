export type ScenarioType =
  | 'Normal'
  | 'HighVolume'
  | 'LimitExceeded'
  | 'DuplicateKeys'
  | 'InvalidPayload';

export type OrderSide = 'BUY' | 'SELL';

export interface OrderPayload {
  idempotencyKey: string;
  accountId: string;
  symbol: string;
  side: OrderSide;
  type: 'MARKET';
  quantity?: number; // omitted for InvalidPayload scenario
}

const SIDES: OrderSide[] = ['BUY', 'SELL'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function uuid(): string {
  return crypto.randomUUID();
}

export function buildOrderPayload(
  scenario: ScenarioType,
  symbols: string[],
  accountId: string,
  sharedIdempotencyKey?: string, // for DuplicateKeys
): OrderPayload {
  const symbol = randomItem(symbols);
  const side = randomItem(SIDES);
  const idempotencyKey = sharedIdempotencyKey ?? uuid();

  switch (scenario) {
    case 'Normal':
      return { idempotencyKey, accountId, symbol, side, type: 'MARKET', quantity: randomInt(1, 50) };

    case 'HighVolume':
      return { idempotencyKey, accountId, symbol, side, type: 'MARKET', quantity: randomInt(800, 999) };

    case 'LimitExceeded':
      return { idempotencyKey, accountId, symbol, side, type: 'MARKET', quantity: randomInt(1001, 1200) };

    case 'DuplicateKeys':
      // Same key every time — tests idempotency
      return { idempotencyKey, accountId, symbol, side, type: 'MARKET', quantity: randomInt(1, 50) };

    case 'InvalidPayload':
      // Deliberately omit quantity to trigger 400
      return { idempotencyKey, accountId, symbol, side, type: 'MARKET' };
  }
}

/** Returns the shared idempotency key for DuplicateKeys runs (generated once per run). */
export function makeDuplicateKey(): string {
  return uuid();
}
