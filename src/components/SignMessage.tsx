import { useState } from "react";
import { daccSignMessage } from "dacc-js";
import { useWallet } from "../contexts/WalletContext";
import { payidx } from "../config/chain";

export function SignMessage() {
  const { unlockedWallet } = useWallet();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const handleSign = async () => {
    if (!unlockedWallet) return;
    if (!message) {
      setError("Please enter a message to sign.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      setSignature(null);

      const result = await daccSignMessage({
        daccPublickey: unlockedWallet.daccPublickey,
        passwordSecretkey: unlockedWallet.passwordSecretkey,
        network: payidx,
        message,
      });

      setSignature(result.signature);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signing failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-section">
      <h3>Sign Message</h3>

      <div className="field">
        <label>Message</label>
        <textarea
          rows={4}
          placeholder="Enter message to sign..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={loading}
        />
      </div>

      <button className="btn-primary" onClick={handleSign} disabled={loading}>
        {loading ? "Signing with Passkey..." : "Sign Message"}
      </button>

      {error && <p className="error-text">{error}</p>}

      {signature && (
        <div className="success-box">
          <p>✅ Message signed!</p>
          <label>Signature:</label>
          <textarea readOnly rows={4} value={signature} className="signature-output" />
        </div>
      )}
    </div>
  );
}
