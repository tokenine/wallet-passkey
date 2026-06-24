import { useState, useEffect } from "react";
import { daccSendToken } from "dacc-js";
import { createPublicClient, http, encodeFunctionData, decodeAbiParameters } from "viem";
import { useWallet } from "../contexts/WalletContext";
import { payidx } from "../config/chain";

const client = createPublicClient({
  chain: payidx,
  transport: http(),
});

async function readDecimals(tokenAddress: string): Promise<number> {
  const data = encodeFunctionData({
    abi: [{ name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] }],
    functionName: "decimals",
  });
  const result = await client.call({
    to: tokenAddress as `0x${string}`,
    data,
  });
  const [dec] = decodeAbiParameters([{ type: "uint8" }], result.data ?? "0x");
  return dec;
}

async function readSymbol(tokenAddress: string): Promise<string> {
  const data = encodeFunctionData({
    abi: [{ name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] }],
    functionName: "symbol",
  });
  const result = await client.call({
    to: tokenAddress as `0x${string}`,
    data,
  });
  const [sym] = decodeAbiParameters([{ type: "string" }], result.data ?? "0x");
  return sym;
}

interface Props {
  onSent: () => void;
}

export function SendToken({ onSent }: Props) {
  const { unlockedWallet } = useWallet();
  const [tokenAddress, setTokenAddress] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState<number | null>(null);
  const [symbol, setSymbol] = useState<string>("");
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenAddress || !tokenAddress.startsWith("0x") || tokenAddress.length !== 42) {
      setDecimals(null);
      setSymbol("");
      return;
    }

    let cancelled = false;

    (async () => {
      setFetchingInfo(true);
      try {
        const [dec, sym] = await Promise.all([
          readDecimals(tokenAddress),
          readSymbol(tokenAddress),
        ]);

        if (!cancelled) {
          setDecimals(dec);
          setSymbol(sym);
        }
      } catch {
        if (!cancelled) {
          setDecimals(null);
          setSymbol("");
        }
      } finally {
        if (!cancelled) setFetchingInfo(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tokenAddress]);

  const handleSend = async () => {
    if (!unlockedWallet) return;
    if (!tokenAddress || !to || !amount) {
      setError("Please fill in all fields.");
      return;
    }
    if (decimals === null) {
      setError("Could not read token info. Check the token contract address.");
      return;
    }

    try {
      setError(null);
      setLoading(true);
      setTxHash(null);

      const result = await daccSendToken({
        daccPublickey: unlockedWallet.daccPublickey,
        passwordSecretkey: unlockedWallet.passwordSecretkey,
        network: payidx,
        tokenAddress: tokenAddress as `0x${string}`,
        to: to as `0x${string}`,
        amount: parseFloat(amount),
        decimals,
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
      <h3>Send ERC-20 Token</h3>

      <div className="field">
        <label>Token Contract Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          disabled={loading}
        />
        {fetchingInfo && <span className="field-hint">⏳ Reading token info...</span>}
        {!fetchingInfo && decimals !== null && symbol && (
          <span className="field-hint success">{symbol} · {decimals} decimals</span>
        )}
        {!fetchingInfo && tokenAddress.length === 42 && decimals === null && (
          <span className="field-hint error">⚠️ Not a valid ERC-20 token</span>
        )}
      </div>

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
        <label>Amount{symbol ? ` (${symbol})` : ""}</label>
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
        {loading ? "Signing with Passkey..." : "Send Token"}
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
