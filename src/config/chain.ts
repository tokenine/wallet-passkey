import { defineChain } from "viem";

/**
 * ThaiChain network configuration.
 *
 * Gas token (TCH) is an ERC-20 deployed at a system reserved address;
 * the chain itself has no native ETH, so nativeCurrency is defined with
 * 0 decimals purely to satisfy viem's defineChain shape. All value-bearing
 * operations should reference the TCH token address below.
 */
export const thaichain = defineChain({
  id: 7,
  name: "ThaiChain",
  nativeCurrency: {
    name: "ThaiChain",
    symbol: "TCH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.thaichain.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "ThaiChain Explorer",
      url: "https://exp.thaichain.org",
    },
  },
});

/**
 * On-chain address of the TCH gas token. Used for balance reads and
 * token transfers because ThaiChain pays gas in TCH rather than ETH.
 */
export const TCH_TOKEN = "0x20C0000000000000000000000000000000000000" as const;
