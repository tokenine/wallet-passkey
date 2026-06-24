import { defineChain } from "viem";

export const payidx = defineChain({
  id: 3773,
  name: "PayIDX",
  nativeCurrency: {
    name: "PayIDX",
    symbol: "PYI",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.payidx.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "PayIDX Explorer",
      url: "https://exp.payidx.com",
    },
  },
});
