import { NullTickPublisher } from './null-tick-publisher';
import { Tick } from '../../domain/tick';

describe('NullTickPublisher', () => {
  it('publish resolves without error', async () => {
    const pub = new NullTickPublisher();
    const tick = Tick.create({ symbol: 'AAPL', bid: 1, ask: 1.01, last: 1.005, volume: 100 });
    await expect(pub.publish(tick, 3)).resolves.toBeUndefined();
  });
});
