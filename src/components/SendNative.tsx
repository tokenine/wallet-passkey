import { useState } from "react";
import { daccSendNative } from "dacc-js";
import { useWallet } from "../contexts/WalletContext";
import { payidx } from "../config/chain";

interface Props {
  onSent: () => void;
}

export function SendNative({ onSent }: Props) {
  const { unlockedWallet } = useWallet();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleSend = async () => {
    if (!unlockedWallet) return;
    if (!to || !amount) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      setTxHash(null);

      const result = await daccSendNative({
        daccPublickey: unlockedWallet.daccPublickey,
        passwordSecretkey: unlockedWallet.passwordSecretkey,
        network: payidx,
        to: to as `0x${string}`,
        amount: parseFloat(amount),
      });

      setTxHash(result.txHash);
      onSent();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-section">
      <h3>Send {payidx.nativeCurrency.symbol}</h3>

      <div className="field">
        <label>Recipient Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={to}
          onChange={(e) => setTo(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="field">
        <label>Amount ({payidx.nativeCurrency.symbol})</label>
        <input
          type="number"
          step="0.000001"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={loading}
        />
      </div>

      <button className="btn-primary" onClick={handleSend} disabled={loading}>
        {loading ? "Signing with Passkey..." : `Send ${payidx.nativeCurrency.symbol}`}
      </button>

      {error && <p className="error-text">{error}</p>}

      {txHash && (
        <div className="success-box">
          <p>✅ Transaction sent!</p>
          <p>
            <a
              href={`${payidx.blockExplorers!.default.url}/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View on explorer
            </a>
          </p>
          <code className="tx-hash">{txHash}</code>
        </div>
      )}
    </div>
  );
}
