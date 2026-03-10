export class ExecutionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionValidationError';
  }
}
