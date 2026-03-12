import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export interface TerminalState {
  selectedSymbol: string;
  connectionStatus: ConnectionStatus;
}

const initialState: TerminalState = {
  selectedSymbol: 'AAPL',
  connectionStatus: 'connecting',
};

export const terminalSlice = createSlice({
  name: 'terminal',
  initialState,
  reducers: {
    setSelectedSymbol(state, action: PayloadAction<string>) {
      state.selectedSymbol = action.payload;
    },
    setConnectionStatus(state, action: PayloadAction<ConnectionStatus>) {
      state.connectionStatus = action.payload;
    },
  },
});

export const { setSelectedSymbol, setConnectionStatus } = terminalSlice.actions;
export default terminalSlice.reducer;
