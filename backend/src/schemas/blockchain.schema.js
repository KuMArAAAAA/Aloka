// src/schemas/blockchain.schema.js
import { z } from "zod";

export const fundEscrowSchema = {
  body: z.object({
    amount: z
      .union([
        z.number().int().positive(),
        z.string().regex(/^\d+$/, "Amount must be a positive integer string"),
      ])
      .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val)),
  }),
};

export const verifyApplicationSchema = {
  body: z.object({
    amount: z
      .union([
        z.number().int().positive(),
        z.string().regex(/^\d+$/, "Amount must be a positive integer string"),
      ])
      .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val)),
  }),
};

export const setValidatorSchema = {
  body: z.object({
    validatorWallet: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum wallet address"),
    allowed: z.boolean({ required_error: "allowed field is required (true/false)" }),
  }),
};
