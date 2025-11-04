import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectToDatabase } from "./database";
import { seedDatabase } from "./seed";
import { rentCycleScheduler } from "./schedulers/rentCycleScheduler";
import { billNotificationScheduler } from "./schedulers/billNotificationScheduler";
import { activityNotificationService } from "./websocket";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Connect to MongoDB Atlas - NO FALLBACK
    await connectToDatabase();
    
    // Seed database with test data
    await seedDatabase();

    // Start rent cycle scheduler for automatic month transitions
    rentCycleScheduler.start();

    // Start bill notification scheduler for overdue bills and final notices
    billNotificationScheduler.start();

    const server = await registerRoutes(app);

    // Initialize WebSocket server for real-time activity notifications
    activityNotificationService.initialize(server);

    // Setup vite in development mode
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`serving on port ${port}`);
      }
    );
  } catch (error: any) {
    console.error('\n🚨 MongoDB Connection Failed!');
    console.error('❌ The application cannot start without a working MongoDB Atlas connection.');
    console.error('Fix your MongoDB Atlas IP whitelisting or network connectivity.');
    process.exit(1);
  }
})();
