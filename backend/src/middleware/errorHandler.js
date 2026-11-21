// src/middleware/errorHandler.js
import { logger } from "../utils/logger.js";
import { errorResponse } from "../utils/response.js";
import { ZodError } from "zod";

export const errorHandler = (err, req, res, next) => {
  logger.error(`Error handling ${req.method} ${req.url}: ${err.message}`);

  // Handle Zod validation error
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message
    }));

    return errorResponse(res, "Validation Error", 400, {
      code: "VALIDATION_ERROR",
      details
    });
  }

  // Handle custom status errors
  const statusCode = err.statusCode || (err.status ? err.status : 500);
  const message = err.message || "Internal Server Error";
  const code = err.code || "INTERNAL_ERROR";

  return errorResponse(res, message, statusCode, {
    code,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};
