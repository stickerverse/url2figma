import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

const API_KEY_REQUIRED = process.env.API_KEY_REQUIRED === 'true';
const ALLOWED_KEYS = (process.env.ALLOWED_API_KEYS || '').split(',').filter(Boolean);

/**
 * API key authentication middleware
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Skip authentication if not required
  if (!API_KEY_REQUIRED) {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    logger.warn({ ip: req.ip, path: req.path }, 'Request missing API key');
    return res.status(401).json({
      error: {
        message: 'API key required',
        code: 'MISSING_API_KEY',
      },
    });
  }

  if (!ALLOWED_KEYS.includes(apiKey)) {
    logger.warn({ ip: req.ip, path: req.path }, 'Invalid API key');
    return res.status(403).json({
      error: {
        message: 'Invalid API key',
        code: 'INVALID_API_KEY',
      },
    });
  }

  // Store API key in request for later use
  req.headers['x-authenticated-key'] = apiKey;

  next();
}
