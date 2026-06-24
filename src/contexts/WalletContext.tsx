import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { createDaccWallet } from "dacc-js";
import { loadWallet, saveWallet, deleteWallet, type StoredWallet } from "../lib/storage";
import {
  createBackupFile,
  parseBackupFile,
  decryptWithRecoveryPassword,
  type BackupFile,
} from "../lib/backup";
import {
  registerPasskey,
  authenticateWithPasskey,
  isPlatformAuthenticatorAvailable,
} from "../lib/passkey";
import {
  deriveAESKeyFromPRF,
  encryptString,
  decryptString,
  generateRandomSecret,
  bufferToBase64url,
} from "../lib/crypto";

export interface UnlockedWallet {
  address: string;
  daccPublickey: string;
  passwordSecretkey: string;
}

type WalletStatus = "loading" | "none" | "locked" | "unlocked";

interface RecoveryMode {
  backup: BackupFile;
  requiresRecovery: true;
}

interface WalletContextValue {
  status: WalletStatus;
  storedWallet: StoredWallet | null;
  unlockedWallet: UnlockedWallet | null;
  platformAuthAvailable: boolean;
  recoveryMode: RecoveryMode | null;
  createWallet: () => Promise<void>;
  unlock: () => Promise<void>;
  lock: () => void;
  removeWallet: () => Promise<void>;
  exportBackup: (recoveryPassword: string) => Promise<string>;
  importBackup: (jsonText: string) => Promise<void>;
  recoverWithPassword: (recoveryPassword: string) => Promise<void>;
  cancelRecovery: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("loading");
  const [storedWallet, setStoredWallet] = useState<StoredWallet | null>(null);
  const [unlockedWallet, setUnlockedWallet] = useState<UnlockedWallet | null>(null);
  const [platformAuthAvailable, setPlatformAuthAvailable] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState<RecoveryMode | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await loadWallet();
      if (stored) {
        setStoredWallet(stored);
        setStatus("locked");
      } else {
        setStatus("none");
      }
      const available = await isPlatformAuthenticatorAvailable();
      setPlatformAuthAvailable(available);
    })();
  }, []);

  const createWallet = useCallback(async () => {
    const passwordSecretkey = generateRandomSecret(32);
    const result = await createDaccWallet({ passwordSecretkey });
    const passkeyResult = await registerPasskey();

    if (!passkeyResult.prfSupported || !passkeyResult.prfOutput) {
      throw new Error(
        "Your authenticator does not support the PRF extension. " +
          "Please use a passkey that supports PRF (e.g., iCloud Keychain on macOS/iOS, Chrome on desktop).",
      );
    }

    const aesKey = await deriveAESKeyFromPRF(passkeyResult.prfOutput);
    const encrypted = await encryptString(aesKey, passwordSecretkey);

    const walletData: StoredWallet = {
      address: result.address,
      daccPublickey: result.daccPublickey,
      encryptedSecret: encrypted.ciphertext,
      iv: encrypted.iv,
      prfSalt: passkeyResult.prfSalt,
      credentialId: passkeyResult.credentialId,
      prfSupported: passkeyResult.prfSupported,
      createdAt: Date.now(),
    };

    await saveWallet(walletData);
    setStoredWallet(walletData);
    setUnlockedWallet({
      address: result.address,
      daccPublickey: result.daccPublickey,
      passwordSecretkey,
    });
    setStatus("unlocked");
  }, []);

  const unlock = useCallback(async () => {
    if (!storedWallet) return;

    const authResult = await authenticateWithPasskey(
      storedWallet.credentialId,
      storedWallet.prfSalt,
    );

    if (!authResult.prfOutput) {
      throw new Error(
        "Passkey not found. This wallet was created on a different device or domain. " +
          "Use the recovery password to unlock instead.",
      );
    }

    const aesKey = await deriveAESKeyFromPRF(authResult.prfOutput);
    const passwordSecretkey = await decryptString(aesKey, {
      ciphertext: storedWallet.encryptedSecret,
      iv: storedWallet.iv,
    });

    setUnlockedWallet({
      address: storedWallet.address,
      daccPublickey: storedWallet.daccPublickey,
      passwordSecretkey,
    });
    setStatus("unlocked");
  }, [storedWallet]);

  const lock = useCallback(() => {
    setUnlockedWallet(null);
    if (storedWallet) {
      setStatus("locked");
    }
  }, [storedWallet]);

  const removeWallet = useCallback(async () => {
    await deleteWallet();
    setStoredWallet(null);
    setUnlockedWallet(null);
    setRecoveryMode(null);
    setStatus("none");
  }, []);

  const exportBackup = useCallback(
    async (recoveryPassword: string) => {
      if (!storedWallet || !unlockedWallet) return "";
      return createBackupFile({
        wallet: storedWallet,
        passwordSecretkey: unlockedWallet.passwordSecretkey,
        recoveryPassword,
      });
    },
    [storedWallet, unlockedWallet],
  );

  const importBackup = useCallback(async (jsonText: string) => {
    const backup = parseBackupFile(jsonText);

    // Check if this backup has recovery data
    if (!backup.recoveryEncrypted || !backup.recoveryIv || !backup.recoverySalt) {
      // No recovery data - save as-is, user must have the same passkey
      await saveWallet(backup.wallet);
      setStoredWallet(backup.wallet);
      setUnlockedWallet(null);
      setRecoveryMode(null);
      setStatus("locked");
      return;
    }

    // Has recovery data - try passkey first
    try {
      const authResult = await authenticateWithPasskey(
        backup.wallet.credentialId,
        backup.wallet.prfSalt,
      );

      if (authResult.prfOutput) {
        // Passkey works - save and unlock normally
        const aesKey = await deriveAESKeyFromPRF(authResult.prfOutput);
        const passwordSecretkey = await decryptString(aesKey, {
          ciphertext: backup.wallet.encryptedSecret,
          iv: backup.wallet.iv,
        });

        await saveWallet(backup.wallet);
        setStoredWallet(backup.wallet);
        setUnlockedWallet({
          address: backup.wallet.address,
          daccPublickey: backup.wallet.daccPublickey,
          passwordSecretkey,
        });
        setStatus("unlocked");
        return;
      }
    } catch {
      // Passkey failed - will try recovery
    }

    // Passkey doesn't work - enter recovery mode
    setRecoveryMode({ backup, requiresRecovery: true });
    setStatus("locked");
  }, []);

  const recoverWithPassword = useCallback(async (recoveryPassword: string) => {
    if (!recoveryMode) return;

    const { backup } = recoveryMode;
    if (!backup.recoveryEncrypted || !backup.recoveryIv || !backup.recoverySalt) {
      throw new Error("This backup file does not have recovery data.");
    }

    // 1. Decrypt passwordSecretkey with recovery password
    const passwordSecretkey = await decryptWithRecoveryPassword(
      recoveryPassword,
      backup.recoveryEncrypted,
      backup.recoveryIv,
      backup.recoverySalt,
    );

    // 2. Register a NEW passkey for this device/domain
    const passkeyResult = await registerPasskey();

    if (!passkeyResult.prfSupported || !passkeyResult.prfOutput) {
      throw new Error(
        "Your authenticator does not support the PRF extension.",
      );
    }

    // 3. Re-encrypt passwordSecretkey with new passkey
    const aesKey = await deriveAESKeyFromPRF(passkeyResult.prfOutput);
    const encrypted = await encryptString(aesKey, passwordSecretkey);

    // 4. Update stored wallet with new passkey data
    const newWallet: StoredWallet = {
      ...backup.wallet,
      credentialId: passkeyResult.credentialId,
      prfSalt: passkeyResult.prfSalt,
      encryptedSecret: encrypted.ciphertext,
      iv: encrypted.iv,
      prfSupported: passkeyResult.prfSupported,
    };

    await saveWallet(newWallet);
    setStoredWallet(newWallet);
    setUnlockedWallet({
      address: newWallet.address,
      daccPublickey: newWallet.daccPublickey,
      passwordSecretkey,
    });
    setRecoveryMode(null);
    setStatus("unlocked");
  }, [recoveryMode]);

  const cancelRecovery = useCallback(() => {
    setRecoveryMode(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        status,
        storedWallet,
        unlockedWallet,
        platformAuthAvailable,
        recoveryMode,
        createWallet,
        unlock,
        lock,
        removeWallet,
        exportBackup,
        importBackup,
        recoverWithPassword,
        cancelRecovery,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}

// Re-export for convenience
export { bufferToBase64url };
