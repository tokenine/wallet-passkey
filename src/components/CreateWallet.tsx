import { useState, useRef } from "react";
import { useWallet } from "../contexts/WalletContext";

export function CreateWallet() {
  const { createWallet, platformAuthAvailable, importBackup } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    try {
      setError(null);
      setLoading(true);
      await createWallet();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create wallet.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportClick = () => {
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

  return (
    <div className="card">
      <div className="card-icon">🔐</div>
      <h1>Create Passkey Wallet</h1>
      <p className="subtitle">
        A new EVM wallet will be generated and encrypted using your device's Passkey
        (Face ID, Touch ID, or security key). You'll need biometric authentication
        every time you unlock or sign transactions.
      </p>

      {!platformAuthAvailable && (
        <div className="warning-banner">
          ⚠️ No platform authenticator detected. A security key or passkey-compatible
          browser is required.
        </div>
      )}

      <div className="info-box">
        <h3>How it works:</h3>
        <ol>
          <li>A random secret key is generated locally on your device</li>
          <li>
            A dacc-js wallet is created from that secret, producing an encrypted key
            blob (<code>daccPublickey</code>)
          </li>
          <li>
            Your Passkey derives a symmetric key via the WebAuthn PRF extension, which
            encrypts the secret
          </li>
          <li>
            Only your biometrics can unlock the secret and authorize transactions
          </li>
        </ol>
      </div>

      <button className="btn-primary" onClick={handleCreate} disabled={loading}>
        {loading ? "Creating wallet..." : "Create Wallet"}
      </button>

      <div className="divider">
        <span>or</span>
      </div>

      <button className="btn-secondary" onClick={handleImportClick}>
        ⬆ Import from Backup File
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
