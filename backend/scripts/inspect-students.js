import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, nisn: true, fullName: true, walletAddress: true, walletBoundAt: true }
  });
  console.log(JSON.stringify(students, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
