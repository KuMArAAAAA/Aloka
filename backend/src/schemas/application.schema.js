// src/schemas/application.schema.js
import { z } from "zod";

export const createApplicationSchema = {
  body: z.object({
    studentId: z.string().uuid("Invalid student ID format"),
    academicYear: z.string().regex(/^\d{4}\/\d{4}$/, "Academic year must be formatted as YYYY/YYYY (e.g., 2025/2026)"),
    amount: z.number().positive("Nominal bantuan must be positive").optional(),
  }),
};

export const listApplicationsQuerySchema = {
  query: z.object({
    academicYear: z.string().optional(),
    onchainStatus: z.enum(["UNSUBMITTED", "AWAITING_REVIEW", "VERIFIED", "DISTRIBUTED", "REJECTED"]).optional(),
    schoolId: z.string().uuid().optional(),
  }),
};
