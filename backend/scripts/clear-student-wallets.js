import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.student.updateMany({
    data: {
      walletAddress: null,
      walletBoundAt: null,
    },
  });
  console.log(`Cleared walletAddress for ${result.count} students in database.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
