// Minimal shell state shape that trading-mfe needs to read.
// The actual store lives in the shell; this type is used only for useSelector generics.
export interface ShellState {
  auth: {
    token: string | null;
    accountId: string | null;
    username: string | null;
  };
  terminal: {
    selectedSymbol: string;
    connectionStatus: 'connected' | 'connecting' | 'disconnected';
  };
}
