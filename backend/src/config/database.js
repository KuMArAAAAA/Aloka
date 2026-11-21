// src/config/database.js
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
};

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully via Prisma");
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`);
    throw error;
  }
};
