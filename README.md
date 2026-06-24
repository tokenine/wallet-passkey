# 🔐 Passkey Wallet

A Web3 EVM wallet that uses **Passkey (Face ID / Touch ID / Security Key)** to encrypt the private key, eliminating the need for seed phrases.

## Features

- ✅ Create a new wallet on the client — no seed phrase required
- ✅ Encrypt with Passkey (WebAuthn PRF extension)
- ✅ Backup / Restore across devices with a recovery password
- ✅ Send native tokens and ERC-20 tokens
- ✅ Call smart contracts (write) and sign messages
- ✅ Auto-read ERC-20 token decimals from RPC
- ✅ Dark / Light mode, responsive design
- ✅ Deploy on Cloudflare Workers — no server required

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser (Client)                                    │
│                                                      │
│  Create:                                             │
│   1. Generate random passwordSecretKey               │
│   2. createDaccWallet({ passwordSecretKey })         │
│   3. Register Passkey + PRF extension               │
│   4. Encrypt passwordSecretKey with PRF-derived key │
│   5. Store in IndexedDB                              │
│                                                      │
│  Unlock:                                             │
│   1. Passkey biometrics → PRF output                 │
│   2. Decrypt passwordSecretKey                       │
│   3. Perform transactions (send, write, sign)        │
│                                                      │
│  Backup / Restore:                                   │
│   1. Export → JSON + recovery password               │
│   2. Import on a new device → Passkey not found      │
│      → Enter recovery password → Create new Passkey  │
│                                                      │
└─────────────────────────────────────────────────────┘
         │ (optional: upload JSON to Google Drive, iCloud)
```

### Technology Stack

| Component      | Technology                                  |
| -------------- | ------------------------------------------- |
| Framework      | React 19 + TypeScript + Vite 8              |
| Wallet Engine  | [dacc-js](https://dacc-js.thefactlab.org/)  |
| Blockchain     | viem (EVM)                                  |
| Authentication | WebAuthn API (PRF extension)                |
| Encryption     | Web Crypto API (AES-256-GCM + HKDF)         |
| Recovery       | PBKDF2 + AES-256-GCM                        |
| Storage        | IndexedDB (local)                           |
| Deploy         | Cloudflare Workers (static assets)          |

## Getting Started

### Installation

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
# → http://localhost:5173
```

### Production Build

```bash
npm run build
```

### Deploy to Cloudflare Workers

```bash
npx wrangler deploy
# → https://passkey-wallet.tokenine.workers.dev
```

## Usage

### 1. Create a New Wallet

1. Open the web app → Click **Create Wallet**
2. Register a Passkey (Face ID / Touch ID / Security Key)
3. Wallet is created and encrypted

### 2. Backup

1. Open **Dashboard** → Click **⬇ Backup to file**
2. Set a **Recovery Password** (minimum 6 characters)
3. Download the JSON file → Store it securely (Google Drive, iCloud, USB)

> ⚠️ This Recovery Password can restore your wallet if you change devices or domains — do not forget it!

### 3. Restore on a New Device

1. Open the web app on the new device → Click **⬆ Import from Backup File**
2. Select the JSON backup file
3. If the original Passkey is still available → Use Passkey to unlock
4. If Passkey is not found → Enter the Recovery Password → A new Passkey is created automatically

### 4. Transactions

| Feature          | Description                                 |
| ---------------- | ------------------------------------------- |
| Send Native      | Send native tokens (e.g., PYI)              |
| Send Token       | Send ERC-20 tokens (auto-read decimals)     |
| Write Contract   | Call functions in a smart contract          |
| Sign Message     | Sign a message                              |

## Project Structure

```
src/
├── config/
│   └── chain.ts              ← EVM network configuration (PayIDX)
├── lib/
│   ├── backup.ts             ← Create/read backup JSON + recovery encryption
│   ├── crypto.ts             ← AES-GCM, HKDF, base64 utilities
│   ├── passkey.ts            ← WebAuthn PRF registration + authentication
│   └── storage.ts            ← IndexedDB wallet storage
├── contexts/
│   └── WalletContext.tsx     ← Global state: create/unlock/lock/export/recover
├── components/
│   ├── ConfirmModal.tsx      ← Modal dialog replacing window.confirm
│   ├── CreateWallet.tsx      ← Wallet creation + import screen
│   ├── Dashboard.tsx         ← Dashboard: balance, tabs, backup
│   ├── ExportPasswordModal.tsx ← Recovery password modal on export
│   ├── SendNative.tsx        ← Send native tokens
│   ├── SendToken.tsx         ← Send ERC-20 tokens (auto decimals)
│   ├── SignMessage.tsx       ← Sign a message
│   ├── UnlockWallet.tsx      ← Unlock screen + recovery mode
│   └── WriteContract.tsx     ← Smart contract interaction
├── App.tsx                   ← Router based on wallet state
├── App.css                   ← Styling
└── main.tsx                  ← Entry point
```

## Chain Configuration

Edit `src/config/chain.ts` to change the network:

```typescript
export const payidx = defineChain({
  id: 3773,
  name: "PayIDX",
  nativeCurrency: { name: "PayIDX", symbol: "PYI", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.payidx.com"] } },
  blockExplorers: { default: { name: "PayIDX Explorer", url: "https://exp.payidx.com" } },
});
```

## Passkey Requirements

- Must use an authenticator that supports the **PRF extension**
- Supported: iCloud Keychain (macOS/iOS), Chrome passkey (desktop)
- Requires **HTTPS** or **localhost**
- Passkeys are device-scoped — use a recovery password when changing devices

## License

GPL-3.0
