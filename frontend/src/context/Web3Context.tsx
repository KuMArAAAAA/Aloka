"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from "../contracts/addresses";
import { ALOKA_ESCROW_ABI, MOCK_IDR_ABI } from "../contracts/abis";

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null;
  signer: ethers.JsonRpcSigner | null;
  escrowContract: ethers.Contract | null;
  mockIdrContract: ethers.Contract | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: () => Promise<void>;
  isOwner: boolean;
  isValidator: boolean;
  escrowBalance: bigint;
  userMidrBalance: bigint;
  totalFunded: bigint;
  totalDistributed: bigint;
  nextApplicationId: number;
  refreshContractStats: () => Promise<void>;
  isLoading: boolean;
  statusMessage: string | null;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  chainId: null,
  isCorrectNetwork: false,
  provider: null,
  signer: null,
  escrowContract: null,
  mockIdrContract: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchNetwork: async () => {},
  isOwner: false,
  isValidator: false,
  escrowBalance: BigInt(0),
  userMidrBalance: BigInt(0),
  totalFunded: BigInt(0),
  totalDistributed: BigInt(0),
  nextApplicationId: 1,
  refreshContractStats: async () => {},
  isLoading: false,
  statusMessage: null,
  error: null,
});

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | ethers.JsonRpcProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isValidator, setIsValidator] = useState<boolean>(false);
  const [escrowBalance, setEscrowBalance] = useState<bigint>(BigInt(0));
  const [userMidrBalance, setUserMidrBalance] = useState<bigint>(BigInt(0));
  const [totalFunded, setTotalFunded] = useState<bigint>(BigInt(0));
  const [totalDistributed, setTotalDistributed] = useState<bigint>(BigInt(0));
  const [nextApplicationId, setNextApplicationId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCorrectNetwork = chainId === NETWORK_CONFIG.chainId;

  // Initialize read-only or browser provider
  const initReadProvider = useCallback(() => {
    try {
      const rpcUrl = NETWORK_CONFIG.rpcUrls[0];
      return new ethers.JsonRpcProvider(rpcUrl);
    } catch (e) {
      console.warn("Could not init fallback RPC provider", e);
      return null;
    }
  }, []);

  const refreshContractStats = useCallback(async () => {
    try {
      let activeProvider = provider;
      if (!activeProvider) {
        activeProvider = initReadProvider();
      }
      if (!activeProvider) return;

      const escrowRead = new ethers.Contract(
        CONTRACT_ADDRESSES.escrow,
        ALOKA_ESCROW_ABI,
        activeProvider
      );
      const tokenRead = new ethers.Contract(
        CONTRACT_ADDRESSES.mockIdr,
        MOCK_IDR_ABI,
        activeProvider
      );

      const [funded, distributed, nextId, eBalance] = await Promise.all([
        escrowRead.totalFunded().catch(() => BigInt(0)),
        escrowRead.totalDistributed().catch(() => BigInt(0)),
        escrowRead.nextApplicationId().catch(() => BigInt(1)),
        tokenRead.balanceOf(CONTRACT_ADDRESSES.escrow).catch(() => BigInt(0)),
      ]);

      setTotalFunded(funded);
      setTotalDistributed(distributed);
      setNextApplicationId(Number(nextId));
      setEscrowBalance(eBalance);

      if (account) {
        const [uBal, validatorCheck, ownerCheck] = await Promise.all([
          tokenRead.balanceOf(account).catch(() => BigInt(0)),
          escrowRead.isSchoolValidator(account).catch(() => false),
          escrowRead.owner().catch(() => CONTRACT_ADDRESSES.governmentOwner),
        ]);
        setUserMidrBalance(uBal);
        setIsValidator(Boolean(validatorCheck));
        setIsOwner(
          account.toLowerCase() === ownerCheck.toLowerCase() ||
          account.toLowerCase() === CONTRACT_ADDRESSES.governmentOwner.toLowerCase()
        );
      }
    } catch (err: any) {
      console.warn("Stats refresh notice:", err?.message || err);
    }
  }, [provider, account, initReadProvider]);

  // Handle wallet connection
  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setError("Ekstensi Web3 wallet (MetaMask) tidak terdeteksi. Silakan instal MetaMask.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const currentSigner = await browserProvider.getSigner();

      const userAccount = accounts[0];
      setAccount(userAccount);
      setChainId(Number(network.chainId));
      setProvider(browserProvider);
      setSigner(currentSigner);

      if (Number(network.chainId) !== NETWORK_CONFIG.chainId) {
        await switchNetwork();
      }
    } catch (err: any) {
      console.error("Connect error:", err);
      setError(err?.message || "Gagal menghubungkan wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setIsOwner(false);
    setIsValidator(false);
    setUserMidrBalance(BigInt(0));
  };

  const switchNetwork = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
      });
    } catch (switchError: any) {
      // Chain not added to metamask
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: NETWORK_CONFIG.chainIdHex,
                chainName: NETWORK_CONFIG.chainName,
                nativeCurrency: NETWORK_CONFIG.nativeCurrency,
                rpcUrls: NETWORK_CONFIG.rpcUrls,
                blockExplorerUrls: NETWORK_CONFIG.blockExplorerUrls,
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add network", addError);
        }
      }
    }
  };

  // Listen to accounts and chain changed
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      const readProv = initReadProvider();
      if (readProv) setProvider(readProv);
      return;
    }

    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        disconnectWallet();
      }
    };

    const handleChainChanged = (hexChainId: string) => {
      setChainId(parseInt(hexChainId, 16));
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    // Initial check
    const browserProvider = new ethers.BrowserProvider(ethereum);
    browserProvider
      .send("eth_accounts", [])
      .then(async (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const net = await browserProvider.getNetwork();
          setChainId(Number(net.chainId));
          setProvider(browserProvider);
          const s = await browserProvider.getSigner();
          setSigner(s);
        } else {
          setProvider(browserProvider);
        }
      })
      .catch(() => {
        const readProv = initReadProvider();
        if (readProv) setProvider(readProv);
      });

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [initReadProvider]);

  // Refresh stats on load or account change
  useEffect(() => {
    refreshContractStats();
    const interval = setInterval(refreshContractStats, 15000);
    return () => clearInterval(interval);
  }, [refreshContractStats]);

  const escrowContract = signer
    ? new ethers.Contract(CONTRACT_ADDRESSES.escrow, ALOKA_ESCROW_ABI, signer)
    : provider
    ? new ethers.Contract(CONTRACT_ADDRESSES.escrow, ALOKA_ESCROW_ABI, provider)
    : null;

  const mockIdrContract = signer
    ? new ethers.Contract(CONTRACT_ADDRESSES.mockIdr, MOCK_IDR_ABI, signer)
    : provider
    ? new ethers.Contract(CONTRACT_ADDRESSES.mockIdr, MOCK_IDR_ABI, provider)
    : null;

  return (
    <Web3Context.Provider
      value={{
        account,
        chainId,
        isCorrectNetwork,
        provider,
        signer,
        escrowContract,
        mockIdrContract,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        isOwner,
        isValidator,
        escrowBalance,
        userMidrBalance,
        totalFunded,
        totalDistributed,
        nextApplicationId,
        refreshContractStats,
        isLoading,
        statusMessage,
        error,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);
