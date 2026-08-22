import rateLimit from 'express-rate-limit';

// Public chat API rate limiter (prevents spam on embed widget & public endpoints)
export const publicChatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait a moment before sending another message.',
    escalation_required: false,
  },
});

// General app API rate limiter
export const appApiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // 600 requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
});
