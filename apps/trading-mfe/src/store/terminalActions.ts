import { createAction } from '@reduxjs/toolkit';

// Re-export the shell's terminalSlice actions by their action type strings.
// The actual reducers live in the shell; remotes dispatch by type string via the shared store singleton.
export const setSelectedSymbol = createAction<string>('terminal/setSelectedSymbol');
export const setConnectionStatus = createAction<'connected' | 'connecting' | 'disconnected'>(
  'terminal/setConnectionStatus',
);
