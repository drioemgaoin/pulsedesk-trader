// Type declarations for Module Federation remote modules.
// These virtual modules are resolved at runtime by @originjs/vite-plugin-federation.
declare module 'tradingMfe/TradingTerminalPage' {
  const TradingTerminalPage: React.ComponentType;
  export default TradingTerminalPage;
}

declare module 'portfolioMfe/PortfolioPage' {
  const PortfolioPage: React.ComponentType;
  export default PortfolioPage;
}

declare module 'ordersMfe/OrdersPage' {
  const OrdersPage: React.ComponentType;
  export default OrdersPage;
}

declare module 'simulatorMfe/SimulatorPage' {
  const SimulatorPage: React.ComponentType;
  export default SimulatorPage;
}
