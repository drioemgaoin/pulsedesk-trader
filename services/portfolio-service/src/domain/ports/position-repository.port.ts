import { Position } from '../position.entity';

export const POSITION_REPOSITORY = Symbol('IPositionRepository');

export interface IPositionRepository {
  findByAccountAndSymbol(accountId: string, symbol: string): Promise<Position | null>;
  findAllByAccount(accountId: string): Promise<Position[]>;
  savePositionWithFill(position: Position, executionId: string): Promise<'SAVED' | 'DUPLICATE'>;
}
