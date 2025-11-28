/**
 * M-Pesa Statement Upload Routes
 * POST /api/mpesa/upload-statement, GET /api/mpesa/statements, /api/mpesa/statements/:statementId
 * DELETE /api/mpesa/statements/:statementId
 * POST /api/mpesa/matches/:matchId/approve, /api/mpesa/matches/:matchId/reject
 */

import type { Express } from "express";
import {
  uploadMpesaStatement,
  getStatementDetails,
  getLandlordStatements,
  approveMatch,
  rejectMatch,
  deleteStatement,
  uploadMiddleware
} from "../controllers/mpesaStatementController";
import { uploadLimiter } from "../middleware/security";

export function registerMpesaRoutes(app: Express): void {
  // M-Pesa statement upload routes (with upload rate limiting)
  app.post("/api/mpesa/upload-statement", uploadLimiter, uploadMiddleware, uploadMpesaStatement);
  app.get("/api/mpesa/statements", getLandlordStatements);
  app.get("/api/mpesa/statements/:statementId", getStatementDetails);
  app.delete("/api/mpesa/statements/:statementId", deleteStatement);
  app.post("/api/mpesa/matches/:matchId/approve", approveMatch);
  app.post("/api/mpesa/matches/:matchId/reject", rejectMatch);
}
