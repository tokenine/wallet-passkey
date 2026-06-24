import { useState } from "react";
import { daccWriteContract } from "dacc-js";
import { parseAbi } from "viem";
import { useWallet } from "../contexts/WalletContext";
import { payidx } from "../config/chain";

export function WriteContract() {
  const { unlockedWallet } = useWallet();
  const [contractAddress, setContractAddress] = useState("");
  const [abiText, setAbiText] = useState("");
  const [functionName, setFunctionName] = useState("");
  const [argsText, setArgsText] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleWrite = async () => {
    if (!unlockedWallet) return;
    if (!contractAddress || !abiText || !functionName) {
      setError("Contract address, ABI, and function name are required.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      setTxHash(null);

      const abi = parseAbi(abiText.split("\n").filter(Boolean));
      const args = argsText
        ? argsText.split(",").map((a) => {
            const trimmed = a.trim();
            if (trimmed.startsWith("0x")) return trimmed;
            if (/^\d+$/.test(trimmed)) return BigInt(trimmed);
            return trimmed;
          })
        : [];

      const result = await daccWriteContract({
        daccPublickey: unlockedWallet.daccPublickey,
        passwordSecretkey: unlockedWallet.passwordSecretkey,
        network: payidx,
        contractAddress: contractAddress as `0x${string}`,
        abi,
        functionName,
        args,
        value: value ? parseFloat(value) : undefined,
      });

      setTxHash(result.txHash);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transaction failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-section">
      <h3>Write Smart Contract</h3>

      <div className="field">
        <label>Contract Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="field">
        <label>
          ABI (one function per line, e.g.{" "}
          <code>function transfer(address to, uint256 amount)</code>)
        </label>
        <textarea
          rows={5}
          placeholder={`function transfer(address to, uint256 amount)`}
          value={abiText}
          onChange={(e) => setAbiText(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="field">
        <label>Function Name</label>
        <input
          type="text"
          placeholder="transfer"
          value={functionName}
          onChange={(e) => setFunctionName(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="field">
        <label>Arguments (comma-separated, hex and numbers supported)</label>
        <input
          type="text"
          placeholder='0x1234..., 1000000000000000000'
          value={argsText}
          onChange={(e) => setArgsText(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="field">
        <label>Value ({payidx.nativeCurrency.symbol}, optional)</label>
        <input
          type="number"
          step="0.000001"
          placeholder="0.0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
        />
      </div>

      <button className="btn-primary" onClick={handleWrite} disabled={loading}>
        {loading ? "Signing with Passkey..." : "Write Contract"}
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
