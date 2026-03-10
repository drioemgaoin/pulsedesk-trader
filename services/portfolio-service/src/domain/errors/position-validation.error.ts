export class PositionValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'PositionValidationError';
  }
}
