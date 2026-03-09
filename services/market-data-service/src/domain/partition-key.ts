/**
 * Deterministic Kafka partition key for a symbol.
 * djb2 hash mod partition count — ensures the same symbol always routes
 * to the same partition, preserving per-symbol ordering guarantees.
 */
export function symbolPartitionKey(symbol: string, partitions: number): number {
  let hash = 5381;
  for (let i = 0; i < symbol.length; i++) {
    hash = (((hash << 5) + hash) ^ symbol.charCodeAt(i)) >>> 0;
  }
  return hash % partitions;
}
