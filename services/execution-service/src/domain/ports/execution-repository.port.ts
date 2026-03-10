import type { Execution } from '../execution.entity';

export const EXECUTION_REPOSITORY = Symbol('IExecutionRepository');

export interface IExecutionRepository {
  save(execution: Execution): Promise<Execution>;
  findByIdempotencyKey(key: string): Promise<Execution | null>;
}
