"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from "../contracts/addresses";
import { ALOKA_ESCROW_ABI, MOCK_IDR_ABI } from "../contracts/abis";

// sessionStorage — auto-clears when tab/browser closes, so wallet state
// is never persisted overnight.
const SESSION_KEY = "aloka_wallet_connected";
const sessionStore = typeof window !== "undefined" ? window.sessionStorage : null;

type NotifKind = "error" | "info" | "success";
interface Notif {
  id: number;
  kind: NotifKind;
  message: string;
}

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null;
  signer: ethers.JsonRpcSigner | null;
  escrowContract: ethers.Contract | null;
  mockIdrContract: ethers.Contract | null;
  walletAvailable: boolean;
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
  notif: Notif | null;
  dismissNotif: () => void;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  chainId: null,
  isCorrectNetwork: false,
  provider: null,
  signer: null,
  escrowContract: null,
  mockIdrContract: null,
  walletAvailable: false,
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
  notif: null,
  dismissNotif: () => {},
});

const notifSeq = { current: 0 };

function translateError(err: any): string {
  if (!err) return "Terjadi kesalahan yang tidak diketahui.";
  const code = err?.code;
  const msg: string = err?.message || err?.reason || String(err);

  // EIP-1193 rejection
  if (code === 4001 || code === "ACTION_REJECTED" || /user rejected/i.test(msg)) {
    return "Permintaan ditolak di dompet. Klik tombol Hubungkan Wallet lagi untuk mencoba.";
  }
  if (code === -32002) {
    return "Permintaan koneksi dompet sedang menunggu konfirmasi di MetaMask. Buka ekstensi MetaMask untuk menyetujui.";
  }
  if (code === 4902) {
    return `Jaringan ${NETWORK_CONFIG.chainName} belum ditambahkan di MetaMask. Klik "Ganti ke Polygon Amoy" untuk menambahkannya.`;
  }
  if (/network changed/i.test(msg) || /chain changed/i.test(msg)) {
    return "Jaringan dompet berubah. Mohon ulangi koneksi.";
  }
  if (/underlying network changed/i.test(msg)) {
    return "Jaringan dompet berubah saat transaksi. Mohon ulangi koneksi.";
  }
  if (/insufficient funds/i.test(msg)) {
    return "Saldo MATIC tidak cukup untuk biaya gas transaksi ini.";
  }
  if (/nonce/i.test(msg) && /too low/i.test(msg)) {
    return "Nonce transaksi terlalu rendah. Coba lagi dalam beberapa detik.";
  }
  if (/call revert|execution reverted/i.test(msg)) {
    return `Transaksi ditolak smart contract: ${msg.slice(0, 120)}`;
  }
  return msg.slice(0, 200);
}

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
  const [notif, setNotif] = useState<Notif | null>(null);
  const [walletAvailable, setWalletAvailable] = useState<boolean>(false);

  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCorrectNetwork = chainId === NETWORK_CONFIG.chainId;

  const pushNotif = useCallback((kind: NotifKind, message: string, ttl: number = 7000) => {
    notifSeq.current += 1;
    const id = notifSeq.current;
    setNotif({ id, kind, message });
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    if (ttl > 0) {
      notifTimerRef.current = setTimeout(() => {
        setNotif((prev) => (prev?.id === id ? null : prev));
      }, ttl);
    }
  }, []);

  const dismissNotif = useCallback(() => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotif(null);
  }, []);

  const getInjectedProvider = useCallback((): any | null => {
    if (typeof window === "undefined") return null;
    const w = window as any;
    const eth = w.ethereum;
    if (!eth) return null;
    if (eth.providers && Array.isArray(eth.providers) && eth.providers.length > 0) {
      const mm = eth.providers.find((p: any) => p?.isMetaMask);
      return mm || eth.providers[0];
    }
    return eth;
  }, []);

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

  const switchNetwork = useCallback(async () => {
    const eth = getInjectedProvider();
    if (!eth) {
      pushNotif("error", "Dompet Web3 tidak terdeteksi. Silakan pasang MetaMask terlebih dahulu.");
      return;
    }
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
      });
      pushNotif("success", `Berhasil beralih ke ${NETWORK_CONFIG.chainName}.`, 4000);
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        try {
          await eth.request({
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
          pushNotif("success", `Jaringan ${NETWORK_CONFIG.chainName} ditambahkan dan aktif.`, 4000);
        } catch (addError: any) {
          console.error("Failed to add network", addError);
          pushNotif("error", translateError(addError));
        }
      } else if (switchError?.code === 4001) {
        pushNotif("info", "Permintaan ganti jaringan dibatalkan.");
      } else {
        pushNotif("error", translateError(switchError));
      }
    }
  }, [getInjectedProvider, pushNotif]);

  const connectWallet = useCallback(async () => {
    const eth = getInjectedProvider();
    if (!eth) {
      pushNotif(
        "error",
        "Dompet Web3 (MetaMask) tidak terdeteksi. Pasang ekstensi MetaMask dari metamask.io lalu muat ulang halaman."
      );
      return;
    }

    try {
      setIsLoading(true);
      const browserProvider = new ethers.BrowserProvider(eth);
      const accounts: string[] = await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const currentSigner = await browserProvider.getSigner();

      const userAccount = accounts[0];
      setAccount(userAccount);
      setChainId(Number(network.chainId));
      setProvider(browserProvider);
      setSigner(currentSigner);

      try {
        sessionStore?.setItem(SESSION_KEY, "1");
      } catch {}

      if (Number(network.chainId) !== NETWORK_CONFIG.chainId) {
        pushNotif(
          "info",
          `Dompet terhubung ke jaringan lain (Chain ID ${Number(network.chainId)}). Klik "Ganti ke Polygon Amoy" untuk beralih.`
        );
        await switchNetwork();
      } else {
        pushNotif("success", `Dompet terhubung: ${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`, 4000);
      }
    } catch (err: any) {
      console.error("Connect error:", err);
      pushNotif("error", translateError(err));
    } finally {
      setIsLoading(false);
    }
  }, [getInjectedProvider, switchNetwork, pushNotif]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setSigner(null);
    setIsOwner(false);
    setIsValidator(false);
    setUserMidrBalance(BigInt(0));
    try {
      sessionStore?.removeItem(SESSION_KEY);
    } catch {}
    pushNotif("info", "Koneksi dompet diputus dari Aloka. MetaMask tetap aktif di browser.", 4000);
  }, [pushNotif]);

  // Initialize wallet detection + listeners + auto-reconnect
  useEffect(() => {
    const eth = getInjectedProvider();
    if (!eth) {
      setWalletAvailable(false);
      const readProv = initReadProvider();
      if (readProv) setProvider(readProv);
      return;
    }
    setWalletAvailable(true);

    const browserProvider = new ethers.BrowserProvider(eth);

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        const newAcc = accounts[0];
        setAccount(newAcc);
        browserProvider
          .getSigner()
          .then((s) => setSigner(s))
          .catch(() => setSigner(null));
        pushNotif("info", `Akun dompet beralih ke ${newAcc.slice(0, 6)}...${newAcc.slice(-4)}`, 4000);
      } else {
        setAccount(null);
        setSigner(null);
        try {
          sessionStore?.removeItem(SESSION_KEY);
        } catch {}
        pushNotif("info", "Dompet diputus dari browser.");
      }
    };

    const handleChainChanged = (hexChainId: string) => {
      const cid = parseInt(hexChainId, 16);
      setChainId(cid);
      browserProvider
        .getSigner()
        .then((s) => setSigner(s))
        .catch(() => setSigner(null));
      if (cid !== NETWORK_CONFIG.chainId) {
        pushNotif(
          "info",
          `Jaringan domlet berubah ke Chain ID ${cid}. Klik "Ganti ke Polygon Amoy" untuk kembali ke jaringan yang benar.`
        );
      } else {
        pushNotif("success", `Menggunakan jaringan ${NETWORK_CONFIG.chainName}.`, 3000);
      }
    };

    eth.on("accountsChanged", handleAccountsChanged);
    eth.on("chainChanged", handleChainChanged);

    // Try silent reconnect if user previously connected in this tab
    const tryReconnect = sessionStore?.getItem(SESSION_KEY) === "1";
    browserProvider
      .send("eth_accounts", [])
      .then(async (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const net = await browserProvider.getNetwork();
          setChainId(Number(net.chainId));
          setProvider(browserProvider);
          try {
            const s = await browserProvider.getSigner();
            setSigner(s);
          } catch {
            setSigner(null);
          }
        } else if (tryReconnect) {
          // Session flag exists but MetaMask not authorized — keep flag for next click
          setProvider(browserProvider);
        } else {
          setProvider(browserProvider);
        }
      })
      .catch(() => {
        const readProv = initReadProvider();
        if (readProv) setProvider(readProv);
      });

    return () => {
      try {
        eth.removeListener("accountsChanged", handleAccountsChanged);
        eth.removeListener("chainChanged", handleChainChanged);
      } catch {}
    };
  }, [getInjectedProvider, initReadProvider, pushNotif]);

  // Refresh stats on account/provider change + interval
  useEffect(() => {
    refreshContractStats();
    const interval = setInterval(refreshContractStats, 15000);
    return () => clearInterval(interval);
  }, [refreshContractStats]);

  // Cleanup notif timer on unmount
  useEffect(() => {
    return () => {
      if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    };
  }, []);

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
        walletAvailable,
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
        notif,
        dismissNotif,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => useContext(Web3Context);