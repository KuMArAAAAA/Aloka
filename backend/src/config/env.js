// src/config/env.js
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  POLYGON_RPC_URL: z.string().url().default("https://polygon-amoy-bor-rpc.publicnode.com"),
  ESCROW_CONTRACT_ADDRESS: z.string().default("0xd938a4d1e8de7bd0eebe7fba0fbff4fc29154601"),
  TOKEN_CONTRACT_ADDRESS: z.string().default("0xf7CDC1cc0a689585B7E9c25E29319Cd4B73e0Ad2"),
  GOV_PRIVATE_KEY: z.string().optional().default(""),
  SCHOOL_PRIVATE_KEY: z.string().optional().default(""),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  OTP_MOCK_ENABLED: z.preprocess((val) => val === "true" || val === true, z.boolean()).default(true)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
