export const NETWORK_CONFIG = {
  chainId: 80002,
  chainIdHex: "0x13882",
  chainName: "Polygon Amoy",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpcUrls: [
    process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-amoy.polygon.technology",
    "https://polygon-amoy.drpc.org",
  ],
  blockExplorerUrls: ["https://amoy.polygonscan.com"],
};

export const CONTRACT_ADDRESSES = {
  escrow: (process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS || "0x3C485aE79A2928B62087c10c0d1883c330Bb7EBA") as `0x${string}`,
  mockIdr: (process.env.NEXT_PUBLIC_MOCK_IDR_ADDRESS || "0xf7CDC1cc0a689585B7E9c25E29319Cd4B73e0Ad2") as `0x${string}`,
  governmentOwner: (process.env.NEXT_PUBLIC_GOVERNMENT_OWNER_ADDRESS || "0xf4aD431Aa2F60A00676F4CF7ac2f18012a1883f6") as `0x${string}`,
};
