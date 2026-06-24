import { useState, useRef } from "react";
import { useWallet } from "../contexts/WalletContext";
import { ConfirmModal } from "./ConfirmModal";

export function UnlockWallet() {
  const { unlock, storedWallet, removeWallet, importBackup, recoveryMode, recoverWithPassword, cancelRecovery } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUnlock = async () => {
    try {
      setError(null);
      setLoading(true);
      await unlock();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unlock wallet.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setConfirmDelete(false);
    await removeWallet();
  };

  const handleImportConfirm = () => {
    setConfirmImport(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const text = await file.text();
      await importBackup(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import backup.";
      setError(message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRecovery = async () => {
    if (!recoveryPassword) return;
    try {
      setRecoveryLoading(true);
      setError(null);
      await recoverWithPassword(recoveryPassword);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Recovery failed.";
      setError(message);
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-icon">🔓</div>
      <h1>Unlock Wallet</h1>
      <p className="subtitle">
        Authenticate with your Passkey to decrypt the wallet and access your account.
      </p>

      {storedWallet && (
        <div className="address-box">
          <span className="label">Wallet Address</span>
          <code>{storedWallet.address}</code>
        </div>
      )}

      {recoveryMode ? (
        <div className="recovery-section">
          <div className="warning-banner">
            ⚠️ Passkey not found on this device/domain. Use your recovery password to unlock.
          </div>
          <div className="field">
            <label>Recovery Password</label>
            <input
              type="password"
              placeholder="Enter the recovery password you set during export"
              value={recoveryPassword}
              onChange={(e) => setRecoveryPassword(e.target.value)}
              disabled={recoveryLoading}
            />
          </div>
          <button className="btn-primary" onClick={handleRecovery} disabled={recoveryLoading}>
            {recoveryLoading ? "Recovering..." : "🔓 Unlock with Recovery Password"}
          </button>
          <button className="btn-text" onClick={cancelRecovery} style={{ display: "block", margin: "12px auto 0" }}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn-primary" onClick={handleUnlock} disabled={loading}>
          {loading ? "Authenticating..." : "🔓 Unlock with Passkey"}
        </button>
      )}

      {error && <p className="error-text">{error}</p>}

      {!recoveryMode && (
        <>
          <div className="divider">
            <span>or</span>
          </div>

          <div className="link-row">
            <button className="btn-text" onClick={() => setConfirmImport(true)}>
              ⬆ Import
            </button>
            <button className="btn-text-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <ConfirmModal
        open={confirmDelete}
        title="Delete Wallet"
        message="This will permanently delete the wallet from this device. Make sure you have backed up your wallet elsewhere."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmModal
        open={confirmImport}
        title="Import Backup"
        message="Importing a backup will replace the current wallet on this device. Continue?"
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={handleImportConfirm}
        onCancel={() => setConfirmImport(false)}
      />
    </div>
  );
}
