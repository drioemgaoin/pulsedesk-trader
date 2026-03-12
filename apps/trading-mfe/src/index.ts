// Remote entry point — exposed via Module Federation as 'tradingMfe'
// The shell lazy-loads ./TradingTerminalPage from this remote.
// This file is the dev-server entry; it is not used in the production build.
export { default } from './TradingTerminalPage';
