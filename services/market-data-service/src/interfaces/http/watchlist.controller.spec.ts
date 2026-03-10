import { WatchlistController } from './watchlist.controller';
import { GetWatchlistUseCase } from '../../application/get-watchlist.use-case';

const mockUseCase = {
  execute: jest.fn().mockReturnValue({ quotes: [], asOf: '2024-01-01T00:00:00.000Z' }),
} as unknown as GetWatchlistUseCase;

describe('Given a WatchlistController instance', () => {
  describe('when get is called', () => {
    it('should delegate to GetWatchlistUseCase and return the result', () => {
      const ctrl = new WatchlistController(mockUseCase);
      const result = ctrl.get();
      expect(mockUseCase.execute).toHaveBeenCalled();
      expect(result.quotes).toHaveLength(0);
      expect(typeof result.asOf).toBe('string');
    });
  });
});
