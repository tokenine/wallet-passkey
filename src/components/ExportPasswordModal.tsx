import { useState } from "react";
import { ConfirmModal } from "./ConfirmModal";

interface ExportPasswordModalProps {
  open: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}

export function ExportPasswordModal({ open, onConfirm, onCancel }: ExportPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    onConfirm(password);
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  const handleClose = () => {
    setPassword("");
    setConfirmPassword("");
    setError("");
    onCancel();
  };

  return (
    <ConfirmModal
      open={open}
      title="Set Recovery Password"
      variant="primary"
      confirmLabel="Export"
      cancelLabel="Cancel"
      onConfirm={handleConfirm}
      onCancel={handleClose}
      message={
        <div>
          <p style={{ marginBottom: 12 }}>
            This password lets you restore your wallet on a different device
            or domain if your Passkey is not available.
          </p>
          <div style={{ marginBottom: 8 }}>
            <label
              style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}
            >
              Recovery Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Min 6 characters"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 14,
                fontFamily: "var(--sans)",
                background: "var(--bg)",
                color: "var(--text-h)",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label
              style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError("");
              }}
              placeholder="Repeat the password"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontSize: 14,
                fontFamily: "var(--sans)",
                background: "var(--bg)",
                color: "var(--text-h)",
                boxSizing: "border-box",
              }}
            />
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: "4px 0 0" }}>{error}</p>}
          <p style={{ color: "var(--text)", fontSize: 12, marginTop: 8 }}>
            ⚠️ Remember this password — it cannot be recovered if lost.
          </p>
        </div>
      }
    />
  );
}
