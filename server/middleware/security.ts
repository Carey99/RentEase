/**
 * Security Middleware
 * Implements rate limiting, sanitization, and various security measures
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';

// Extend Express Request to include rate limit info
declare module 'express-serve-static-core' {
  interface Request {
    rateLimit?: {
      limit: number;
      current: number;
      remaining: number;
      resetTime: number;
    };
  }
}

/**
 * General API rate limiter
 * Limits each IP to 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Store rate limit data in memory (use Redis in production for distributed systems)
  handler: (req: Request, res: Response) => {
    console.log(`⚠️  Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: 900, // 15 minutes in seconds
    });
  },
});

/**
 * Strict rate limiter for authentication routes
 * Prevents brute force attacks on login/register
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  handler: (req: Request, res: Response) => {
    console.log(`🚨 Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many failed login attempts. Please try again after 15 minutes.',
      retryAfter: 900, // 15 minutes in seconds
    });
  },
});

/**
 * Payment route rate limiter
 * Prevents payment spam and fraud attempts
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 payment requests per hour
  message: {
    error: 'Too many payment requests',
    message: 'Too many payment requests from this IP, please try again later',
  },
  handler: (req: Request, res: Response) => {
    console.log(`💳 Payment rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many payment requests',
      message: 'You have made too many payment requests. Please try again in an hour.',
      retryAfter: 3600, // 1 hour in seconds
    });
  },
});

/**
 * File upload rate limiter
 * Prevents abuse of file upload endpoints (M-Pesa statements, receipts)
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    error: 'Too many upload requests',
    message: 'Too many file uploads from this IP, please try again later',
  },
  handler: (req: Request, res: Response) => {
    console.log(`📁 Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many upload requests',
      message: 'You have made too many file uploads. Please try again in an hour.',
      retryAfter: 3600, // 1 hour in seconds
    });
  },
});

/**
 * MongoDB injection sanitization
 * Removes any keys that start with $ or contain .
 */
export const sanitizeInput = mongoSanitize({
  replaceWith: '_', // Replace prohibited characters with underscore
  onSanitize: ({ req, key }) => {
    console.log(`🔒 Sanitized potentially malicious input from ${req.ip}: key="${key}"`);
  },
});

/**
 * HTTP Parameter Pollution protection
 * Prevents attacks using duplicate parameters
 */
export const preventParameterPollution = hpp({
  whitelist: ['sort', 'filter', 'page', 'limit'], // Allow these params to have multiple values
});

/**
 * Request size limiter
 * Prevents large payload attacks
 */
export const requestSizeLimiter = (req: Request, res: Response, next: NextFunction) => {
  const maxSize = 10 * 1024 * 1024; // 10MB max
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    console.log(`⚠️  Request too large from IP: ${req.ip}`);
    return res.status(413).json({
      error: 'Payload too large',
      message: 'Request size exceeds maximum allowed limit of 10MB',
    });
  }
  
  next();
};

/**
 * Suspicious activity detector
 * Logs and blocks suspicious patterns
 */
export const detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /(\.\.|\/etc\/|\/proc\/|\/sys\/)/i, // Path traversal
    /(union|select|insert|update|delete|drop|create|alter|exec|script)/i, // SQL injection keywords
    /(<script|javascript:|onerror=|onclick=)/i, // XSS patterns
  ];

  const suspicious = suspiciousPatterns.some(pattern => {
    return pattern.test(req.url) || 
           pattern.test(JSON.stringify(req.query)) || 
           pattern.test(JSON.stringify(req.body));
  });

  if (suspicious) {
    console.log(`🚨 SUSPICIOUS ACTIVITY DETECTED from IP: ${req.ip}`);
    console.log(`   URL: ${req.url}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   User-Agent: ${req.headers['user-agent']}`);
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Suspicious activity detected',
    });
  }

  next();
};

/**
 * CORS configuration helper
 * More secure than allowing all origins
 */
export const getCorsOptions = () => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    process.env.PRODUCTION_URL,
  ].filter(Boolean) as string[];

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`⚠️  Blocked CORS request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  };
};

/**
 * Security headers middleware
 * Sets various security-related HTTP headers
 */
export const setSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;"
  );
  
  next();
};

/**
 * Log security events
 */
export const logSecurityEvent = (event: string, details: any) => {
  console.log(`🔐 SECURITY EVENT: ${event}`, {
    timestamp: new Date().toISOString(),
    ...details,
  });
};
