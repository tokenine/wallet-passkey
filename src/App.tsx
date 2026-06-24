import { WalletProvider, useWallet } from "./contexts/WalletContext";
import { CreateWallet } from "./components/CreateWallet";
import { UnlockWallet } from "./components/UnlockWallet";
import { Dashboard } from "./components/Dashboard";
import "./App.css";

function AppContent() {
  const { status, recoveryMode } = useWallet();

  if (status === "loading") {
    return (
      <div className="app-root">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Loading wallet...</p>
        </div>
      </div>
    );
  }

  // If in recovery mode, show UnlockWallet (which handles recovery UI)
  if (recoveryMode) {
    return (
      <div className="app-root">
        <UnlockWallet />
      </div>
    );
  }

  if (status === "none") {
    return (
      <div className="app-root">
        <CreateWallet />
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="app-root">
        <UnlockWallet />
      </div>
    );
  }

  return (
    <div className="app-root">
      <Dashboard />
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
