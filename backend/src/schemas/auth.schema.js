// src/schemas/auth.schema.js
import { z } from "zod";

export const loginSchema = {
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  }),
};

export const studentLoginSchema = {
  body: z.object({
    nisn: z.string().length(10, "NISN must be exactly 10 digits").regex(/^\d+$/, "NISN must contain only numbers"),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth format must be YYYY-MM-DD"),
  }),
};

export const walletBindSchema = {
  body: z.object({
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum wallet address"),
    message: z.string().min(10, "SIWE message is required"),
    signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, "Invalid signature format"),
  }),
};
