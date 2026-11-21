// src/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { errorResponse } from "../utils/response.js";

/**
 * Middleware untuk memverifikasi JWT Bearer Token
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return errorResponse(res, "Access token required", 401, {
      code: "UNAUTHORIZED",
    });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, "Token has expired", 401, {
        code: "TOKEN_EXPIRED",
      });
    }
    return errorResponse(res, "Invalid token", 403, {
      code: "INVALID_TOKEN",
    });
  }
};

/**
 * Middleware RBAC untuk memeriksa role pengguna
 * @param  {...string} allowedRoles - Role yang diizinkan (GOVERNMENT, SCHOOL, STUDENT)
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, "Access forbidden", 403, {
        code: "FORBIDDEN",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Role '${req.user.role}' is not authorized to access this resource`,
        403,
        {
          code: "FORBIDDEN_ROLE",
          requiredRoles: allowedRoles,
        }
      );
    }

    next();
  };
};
