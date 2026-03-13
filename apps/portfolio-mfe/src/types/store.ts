/** Minimal shell state interface — remotes must NOT import RootState from the shell at build time. */
export interface ShellState {
  auth: {
    token: string | null;
    accountId: string | null;
    username: string | null;
  };
}
