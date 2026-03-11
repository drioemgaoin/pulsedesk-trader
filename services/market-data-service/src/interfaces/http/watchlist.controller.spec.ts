import { WatchlistController } from './watchlist.controller';
import { GetWatchlistUseCase } from '../../application/get-watchlist.use-case';

const mockUseCase = {
  execute: jest.fn().mockReturnValue({ quotes: [], asOf: '2024-01-01T00:00:00.000Z' }),
} as unknown as GetWatchlistUseCase;

describe('Given a WatchlistController instance', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('when get is called without a symbols parameter', () => {
    it('should call GetWatchlistUseCase with no filter and return the result', () => {
      const ctrl = new WatchlistController(mockUseCase);
      const result = ctrl.get();
      expect(mockUseCase.execute).toHaveBeenCalledWith(undefined);
      expect(result.quotes).toHaveLength(0);
      expect(typeof result.asOf).toBe('string');
    });
  });

  describe('when get is called with a comma-separated symbols parameter', () => {
    it('should call GetWatchlistUseCase with the parsed uppercase symbol array', () => {
      const ctrl = new WatchlistController(mockUseCase);
      ctrl.get('aapl,tsla, msft ');
      expect(mockUseCase.execute).toHaveBeenCalledWith(['AAPL', 'TSLA', 'MSFT']);
    });
  });
});
