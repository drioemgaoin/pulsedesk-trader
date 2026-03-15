import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import terminalReducer from './terminalSlice';
import themeReducer from './themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    terminal: terminalReducer,
    theme: themeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
