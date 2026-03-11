import { useAuth } from './features/auth/useAuth';
import { TradingTerminal } from './features/terminal/TradingTerminal';

function App() {
  const { token, accountId, status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-900">
        <span className="text-zinc-400 text-sm">Connecting…</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-900">
        <span className="text-red-400 text-sm">
          Authentication failed. Please check your credentials or try refreshing.
        </span>
      </div>
    );
  }

  return <TradingTerminal token={token!} accountId={accountId} />;
}

export default App;
