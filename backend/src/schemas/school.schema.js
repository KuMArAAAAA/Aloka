// src/schemas/school.schema.js
import { z } from "zod";

export const createSchoolRecommendationSchema = {
  body: z.object({
    studentId: z.string().uuid("Invalid student ID format"),
    referenceNumber: z.string().min(3, "Reference number / surat rekomendasi is required"),
    isApproved: z.boolean().default(true),
  }),
};

export const registerSchoolSchema = {
  body: z.object({
    npsn: z.string().length(8, "NPSN must be exactly 8 digits"),
    name: z.string().min(3, "School name is required"),
    address: z.string().optional(),
    validatorWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid validator wallet address").optional(),
  }),
};
