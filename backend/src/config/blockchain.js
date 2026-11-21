// src/config/blockchain.js
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load ABI
const loadAbi = (filename) => {
  const filePath = path.resolve(__dirname, "../../abi", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

export const AlokaEscrowABI = loadAbi("AlokaEscrow.json");
export const MockIDRABI = loadAbi("MockIDR.json");

// Read-only JSON-RPC provider (Polygon Amoy Testnet)
export const provider = new ethers.JsonRpcProvider(env.POLYGON_RPC_URL);

// Contract instances (read-only by default)
export const escrowContract = new ethers.Contract(
  env.ESCROW_CONTRACT_ADDRESS,
  AlokaEscrowABI,
  provider
);

export const tokenContract = new ethers.Contract(
  env.TOKEN_CONTRACT_ADDRESS,
  MockIDRABI,
  provider
);

// Signers (jika private key diset di .env)
export const getGovernmentSigner = () => {
  if (!env.GOV_PRIVATE_KEY) {
    throw new Error("GOV_PRIVATE_KEY is not configured in .env");
  }
  const wallet = new ethers.Wallet(env.GOV_PRIVATE_KEY, provider);
  return new ethers.NonceManager(wallet);
};

export const getSchoolSigner = () => {
  if (!env.SCHOOL_PRIVATE_KEY) {
    throw new Error("SCHOOL_PRIVATE_KEY is not configured in .env");
  }
  const wallet = new ethers.Wallet(env.SCHOOL_PRIVATE_KEY, provider);
  return new ethers.NonceManager(wallet);
};

// Contract instance with signer for executing transactions
export const getEscrowContractWithSigner = (signer) => {
  return new ethers.Contract(env.ESCROW_CONTRACT_ADDRESS, AlokaEscrowABI, signer);
};

export const getTokenContractWithSigner = (signer) => {
  return new ethers.Contract(env.TOKEN_CONTRACT_ADDRESS, MockIDRABI, signer);
};

logger.info(`Blockchain config loaded. Escrow: ${env.ESCROW_CONTRACT_ADDRESS}`);
