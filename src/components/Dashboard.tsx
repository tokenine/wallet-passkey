import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../contexts/WalletContext";
import { getBalanceToken } from "dacc-js";
import { thaichain, TCH_TOKEN } from "../config/chain";
import { ExportPasswordModal } from "./ExportPasswordModal";
import { SendNative } from "./SendNative";
import { SendToken } from "./SendToken";
import { WriteContract } from "./WriteContract";
import { SignMessage } from "./SignMessage";
import { downloadBackupFile } from "../lib/backup";

type Tab = "overview" | "send-native" | "send-token" | "write-contract" | "sign-message";

export function Dashboard() {
  const { unlockedWallet, storedWallet, lock, exportBackup } = useWallet();
  const [tab, setTab] = useState<Tab>("overview");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string>("TCH");
  const [balanceLoading, setBalanceLoading] = useState(false);

  const refreshBalance = useCallback(async () => {
    if (!unlockedWallet) return;
    setBalanceLoading(true);
    try {
      const result = await getBalanceToken({
        address: unlockedWallet.address as `0x${string}`,
        tokenAddress: TCH_TOKEN,
        network: thaichain,
      });
      setBalance(result.balanceFormatted);
      if (result.symbol) setTokenSymbol(result.symbol);
    } catch {
      setBalance("—");
    } finally {
      setBalanceLoading(false);
    }
  }, [unlockedWallet]);

  useEffect(() => {
    if (unlockedWallet) {
      refreshBalance();
    }
  }, [unlockedWallet, refreshBalance]);

  const handleExport = async (recoveryPassword: string) => {
    if (!storedWallet || !unlockedWallet) return;
    try {
      setExporting(true);
      const json = await exportBackup(recoveryPassword);
      downloadBackupFile(json, storedWallet);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "◈" },
    { id: "send-native", label: "Send TCH", icon: "↗" },
    { id: "send-token", label: "Send Token", icon: "◆" },
    { id: "write-contract", label: "Contract", icon: "▤" },
    { id: "sign-message", label: "Sign", icon: "✎" },
  ];

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-brand">
          <img src="/logo-thaichain.svg" alt="ThaiChain" className="brand-icon" />
        </div>
        <button className="btn-lock" onClick={lock}>
          ◇ Lock
        </button>
      </header>

      <div className="account-card">
        <div className="account-row">
          <span className="label">Address</span>
          <div className="address-copy">
            <code className="truncate">{unlockedWallet.address}</code>
            <button
              className="btn-icon"
              title="Copy address"
              onClick={() => navigator.clipboard.writeText(unlockedWallet.address)}
            >
              ⧉
            </button>
            <a
              className="btn-icon"
              title="View on explorer"
              href={`${thaichain.blockExplorers!.default.url}/address/${unlockedWallet.address}`}
              target="_blank"
              rel="noreferrer"
            >
              ↗
            </a>
          </div>
        </div>
        <div className="account-row">
          <span className="label">Balance</span>
          <span className="balance">
            {balanceLoading ? "Loading…" : balance}
            <span className="balance-symbol">{tokenSymbol}</span>
          </span>
        </div>
        <div className="backup-row">
          <button className="btn-text" onClick={refreshBalance} disabled={balanceLoading}>
            ↻ Refresh
          </button>
          <button
            className="btn-text"
            onClick={() => setShowExportModal(true)}
            disabled={exporting}
          >
            ⬇ Backup
          </button>
        </div>
      </div>

      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="tab-content">
        {tab === "overview" && (
          <div className="overview">
            <div className="info-box">
              <h3>Network</h3>
              <p>
                <strong>Chain:</strong> {thaichain.name} (ID {thaichain.id})
              </p>
              <p>
                <strong>RPC:</strong>{" "}
                <code style={{ background: "none", padding: 0 }}>
                  {thaichain.rpcUrls.default.http[0]}
                </code>
              </p>
              <p>
                <strong>Explorer:</strong>{" "}
                <a
                  href={thaichain.blockExplorers!.default.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {thaichain.blockExplorers!.default.url}
                </a>
              </p>
              <p>
                <strong>Gas Token:</strong> {tokenSymbol} (TCH Token)
              </p>
              <p className="muted">
                Secured by your device Passkey. Every transaction requires biometric
                authentication.
              </p>
            </div>
          </div>
        )}

        {tab === "send-native" && <SendNative onSent={refreshBalance} />}
        {tab === "send-token" && <SendToken onSent={refreshBalance} />}
        {tab === "write-contract" && <WriteContract />}
        {tab === "sign-message" && <SignMessage />}
      </main>

      <ExportPasswordModal
        open={showExportModal}
        onConfirm={handleExport}
        onCancel={() => setShowExportModal(false)}
      />
    </div>
  );
}
