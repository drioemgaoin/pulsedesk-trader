export interface ShellState {
  auth: {
    token: string | null;
    accountId: string | null;
    username: string | null;
  };
}
