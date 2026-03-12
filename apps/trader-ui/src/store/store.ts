import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import terminalReducer from './terminalSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    terminal: terminalReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
