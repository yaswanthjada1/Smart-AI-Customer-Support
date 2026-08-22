import rateLimit from 'express-rate-limit';

// Configurable environment variables for public chat rate limiting
const publicRateWindowMs = (parseInt(process.env.PUBLIC_CHAT_RATE_WINDOW || '600', 10)) * 1000;
const publicMaxRequests = parseInt(process.env.PUBLIC_CHAT_RATE_LIMIT || '30', 10);

// Public chat API rate limiter (prevents spam on embed widget & public endpoints)
export const publicChatRateLimiter = rateLimit({
  windowMs: publicRateWindowMs, // e.g. 10 minutes
  max: publicMaxRequests, // e.g. 30 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
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
