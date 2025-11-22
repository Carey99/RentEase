import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectToDatabase } from "./database";
import { seedDatabase } from "./seed";
import { rentCycleScheduler } from "./schedulers/rentCycleScheduler";
import { billNotificationScheduler } from "./schedulers/billNotificationScheduler";
import { startEmailReminderScheduler } from "./schedulers/emailReminderScheduler";
import { activityNotificationService } from "./websocket";
import { sessionConfig, validateSession } from "./middleware/auth";
import {
  apiLimiter,
  sanitizeInput,
  preventParameterPollution,
  requestSizeLimiter,
  detectSuspiciousActivity,
  setSecurityHeaders,
} from "./middleware/security";
import dotenv from "dotenv";

// Only load .env file in development (Render injects env vars directly in production)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();

// Trust proxy - required for rate limiting behind reverse proxies (Render, Nginx, etc.)
app.set('trust proxy', 1);

// Helmet - sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: false, // We'll set custom CSP
  crossOriginEmbedderPolicy: false, // Required for some external resources
}));

// Custom security headers
app.use(setSecurityHeaders);

// CORS configuration for production and development
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Request size limiter - must be before body parsers
app.use(requestSizeLimiter);

// Body parsers with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// MongoDB injection sanitization
app.use(sanitizeInput);

// HTTP Parameter Pollution protection
app.use(preventParameterPollution);

// Detect suspicious activity
app.use(detectSuspiciousActivity);

// Session middleware - MUST be before routes
app.use(sessionConfig);
app.use(validateSession);

// Apply general API rate limiting to all API routes
app.use('/api', apiLimiter);

// Health check endpoint for Render and monitoring services
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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

    // Start email reminder scheduler for automatic rent reminders
    startEmailReminderScheduler();

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
