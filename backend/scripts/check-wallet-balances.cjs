const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const RPC = "https://polygon-amoy-bor-rpc.publicnode.com";
const MOCK_IDR = "0xf7CDC1cc0a689585B7E9c25E29319Cd4B73e0Ad2";

async function balanceOf(wallet) {
  const data =
    "0x70a08231" +
    "000000000000000000000000" +
    wallet.substring(2).toLowerCase();
  const body = {
    jsonrpc: "2.0",
    method: "eth_call",
    params: [{ to: MOCK_IDR, data }, "latest"],
    id: 1,
  };
  const r = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((x) => x.json());
  if (!r.result || r.result === "0x") return 0n;
  return BigInt(r.result);
}

(async () => {
  const students = await prisma.student.findMany({
    where: { walletAddress: { not: null } },
    include: {
      applications: { orderBy: { createdAt: "desc" }, take: 1 },
      school: true,
    },
    orderBy: { fullName: "asc" },
  });

  if (students.length === 0) {
    console.log("\nTidak ada siswa dengan wallet terikat. Login sebagai siswa di /siswa + sign MetaMask dulu.\n");
    await prisma.$disconnect();
    return;
  }

  console.log("\n=== Saldo mIDR per Siswa (on-chain) ===\n");
  for (const s of students) {
    const bal = await balanceOf(s.walletAddress);
    const latest = s.applications[0];
    const status = latest?.onchainStatus || "(no application)";
    const fmtIDR = (n) => "Rp " + Number(n).toLocaleString("id-ID");
    console.log(
      `${s.fullName.padEnd(18)} | NISN ${s.nisn} | ${s.gradeLevel} | ${s.school?.name?.padEnd(20) || "?"} | status ${status.padEnd(14)} | saldo ${fmtIDR(bal)}`
    );
  }
  console.log("");
  await prisma.$disconnect();
})();