// src/routes/index.js
import { Router } from "express";
import authRoutes from "./auth.routes.js";
import studentRoutes from "./student.routes.js";
import schoolRoutes from "./school.routes.js";
import applicationRoutes from "./application.routes.js";
import blockchainRoutes from "./blockchain.routes.js";
import publicRoutes from "./public.routes.js";

const router = Router();

// Root info
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Aloka Web3 Aid Distribution Backend API v1",
    status: "operational",
    endpoints: {
      auth: "/api/v1/auth",
      students: "/api/v1/students",
      schools: "/api/v1/schools",
      applications: "/api/v1/applications",
      blockchain: "/api/v1/blockchain",
      public: "/api/v1/public",
    },
  });
});

// Sub-routers
router.use("/auth", authRoutes);
router.use("/students", studentRoutes);
router.use("/schools", schoolRoutes);
router.use("/applications", applicationRoutes);
router.use("/blockchain", blockchainRoutes);
router.use("/public", publicRoutes);

export default router;
