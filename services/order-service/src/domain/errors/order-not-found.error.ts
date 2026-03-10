export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`Order not found: ${id}`);
    this.name = 'OrderNotFoundError';
  }
}
