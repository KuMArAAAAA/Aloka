import { ethers } from "ethers";

const RPC_URL = "https://polygon-amoy-bor-rpc.publicnode.com";
const ESCROW_ADDR = "0xd938a4d1e8de7bd0eebe7fba0fbff4fc29154601";
const TOKEN_ADDR = "0xf7CDC1cc0a689585B7E9c25E29319Cd4B73e0Ad2";

const provider = new ethers.JsonRpcProvider(RPC_URL);

const ESCROW_ABI = [
  "function owner() view returns (address)",
  "function midrToken() view returns (address)",
  "function totalFunded() view returns (uint256)",
  "function totalDistributed() view returns (uint256)",
  "function nextApplicationId() view returns (uint256)",
  "function isSchoolValidator(address) view returns (bool)"
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

async function check() {
  console.log("=== DETAIL ESCROW SMART CONTRACT (POLYGON AMOY) ===");
  console.log("Alamat Escrow :", ESCROW_ADDR);
  console.log("Alamat Token  :", TOKEN_ADDR);

  const maticBalance = await provider.getBalance(ESCROW_ADDR);
  console.log("Saldo Gas (POL/MATIC) :", ethers.formatEther(maticBalance), "POL");

  const tokenContract = new ethers.Contract(TOKEN_ADDR, ERC20_ABI, provider);
  const escrowContract = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, provider);

  const [tName, tSymbol, tDecimals, mIdrBalance] = await Promise.all([
    tokenContract.name().catch(e => "Unknown: " + e.message),
    tokenContract.symbol().catch(e => "Unknown: " + e.message),
    tokenContract.decimals().catch(e => 0),
    tokenContract.balanceOf(ESCROW_ADDR).catch(e => BigInt(0))
  ]);

  console.log("Nama Token          :", tName, "(" + tSymbol + ")");
  console.log("Desimal Token       :", tDecimals);
  console.log("Saldo Token di Vault:", Number(mIdrBalance).toLocaleString("id-ID"), tSymbol);

  const [owner, midrInEscrow, totalFunded, totalDistributed, nextAppId] = await Promise.all([
    escrowContract.owner().catch(e => "Error: " + e.message),
    escrowContract.midrToken().catch(e => "Error: " + e.message),
    escrowContract.totalFunded().catch(e => BigInt(0)),
    escrowContract.totalDistributed().catch(e => BigInt(0)),
    escrowContract.nextApplicationId().catch(e => BigInt(0))
  ]);

  console.log("Owner (Pemerintah)  :", owner);
  console.log("Token di Escrow     :", midrInEscrow);
  console.log("Total Disetor (Fund): Rp", Number(totalFunded).toLocaleString("id-ID"));
  console.log("Total Tersalurkan   : Rp", Number(totalDistributed).toLocaleString("id-ID"));
  console.log("Antrean On-Chain ID :", Number(nextAppId));

  // Cek juga saldo wallet owner / KPA
  if (owner && owner.startsWith("0x") && !owner.startsWith("Error")) {
    const ownerMatic = await provider.getBalance(owner);
    const ownerToken = await tokenContract.balanceOf(owner).catch(() => BigInt(0));
    console.log("\n=== WALLET OWNER / KPA (" + owner + ") ===");
    console.log("Saldo Gas POL       :", ethers.formatEther(ownerMatic), "POL");
    console.log("Saldo mIDR          : Rp", Number(ownerToken).toLocaleString("id-ID"));
  }
}

check().catch(console.error);
