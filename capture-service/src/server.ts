import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';
import path from 'path';
import logger from './logger';
import { authenticate } from './middleware/auth';
import { CaptureRequestSchema, JobData, ApiError } from './types';
import { addCaptureJob, getJobResult, getNextCompletedJob, getQueueMetrics } from './queue';
import { checkStorageHealth, embedCaptureResult } from './storage';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${PORT}`;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Request logging
app.use((req, res, next) => {
  logger.debug(
    {
      method: req.method,
      path: req.path,
      ip: req.ip,
    },
    'Incoming request'
  );
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: {
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

/**
 * Health check endpoint
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    const [storageHealthy, queueMetrics] = await Promise.all([
      checkStorageHealth(),
      getQueueMetrics(),
    ]);

    const status = storageHealthy ? 'ok' : 'degraded';

    res.status(status === 'ok' ? 200 : 503).json({
      status,
      version: '1.0.0',
      uptime: process.uptime(),
      services: {
        redis: true, // If we get here, Redis is working
        storage: storageHealthy,
        workers: queueMetrics,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(503).json({
      status: 'down',
      version: '1.0.0',
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/capture - Submit a new capture job
 */
app.post('/api/capture', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = CaptureRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: {
          message: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.errors,
        },
      } as ApiError);
    }

    const captureRequest = validationResult.data;
    const jobId = nanoid();

    const jobData: JobData = {
      ...captureRequest,
      jobId,
      createdAt: new Date().toISOString(),
      apiKey: req.headers['x-authenticated-key'] as string | undefined,
    };

    await addCaptureJob(jobData);

    logger.info({ jobId, url: captureRequest.url }, 'Capture job created');

    res.status(202).json({
      jobId,
      status: 'queued',
      statusUrl: `${API_BASE_URL}/api/jobs/${jobId}`,
      createdAt: jobData.createdAt,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create capture job');
    res.status(500).json({
      error: {
        message: 'Failed to create capture job',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    } as ApiError);
  }
});

/**
 * POST /api/capture/direct - Submit pre-extracted schema from Chrome extension
 * This bypasses the Playwright capture and directly stores the schema
 */
app.post('/api/capture/direct', authenticate, async (req: Request, res: Response) => {
  try {
    const { schema, screenshot, metadata } = req.body;

    if (!schema) {
      return res.status(400).json({
        error: {
          message: 'Schema is required',
          code: 'VALIDATION_ERROR',
        },
      } as ApiError);
    }

    const jobId = nanoid();

    // Store the schema directly using data URI encoding
    const storageResult = embedCaptureResult(schema, screenshot);

    // Create a completed job entry
    const jobData = {
      jobId,
      state: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      schemaUrl: storageResult.schemaUrl,
      screenshotUrl: storageResult.screenshotUrl,
      metadata: metadata || {
        url: schema.metadata?.url || 'chrome-extension',
        elementCount: schema.tree ? 1 : 0,
        assetCount: Object.keys(schema.assets || {}).length,
      },
    };

    logger.info({ jobId }, 'Direct capture job created');

    res.status(200).json(jobData);
  } catch (error) {
    logger.error({ error }, 'Failed to process direct capture');
    res.status(500).json({
      error: {
        message: 'Failed to process direct capture',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    } as ApiError);
  }
});

/**
 * GET /api/jobs/:id - Get job status and result
 */
app.get('/api/jobs/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await getJobResult(id);

    if (!result) {
      return res.status(404).json({
        error: {
          message: 'Job not found',
          code: 'JOB_NOT_FOUND',
        },
      } as ApiError);
    }

    res.json(result);
  } catch (error) {
    logger.error({ error, jobId: req.params.id }, 'Failed to get job result');
    res.status(500).json({
      error: {
        message: 'Failed to retrieve job',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    } as ApiError);
  }
});

/**
 * GET /api/jobs/next - Poll for next completed job (for Figma plugin)
 * Supports long polling with timeout parameter
 */
app.get('/api/jobs/next', authenticate, async (req: Request, res: Response) => {
  const timeout = parseInt(req.query.timeout as string || '30000', 10);
  const maxTimeout = 60000; // 1 minute max
  const actualTimeout = Math.min(timeout, maxTimeout);
  const pollInterval = 1000; // Check every second

  const startTime = Date.now();

  const poll = async (): Promise<void> => {
    const result = await getNextCompletedJob();

    if (result) {
      res.json(result);
      return;
    }

    // Check if timeout exceeded
    if (Date.now() - startTime >= actualTimeout) {
      res.status(204).send(); // No content
      return;
    }

    // Continue polling
    setTimeout(poll, pollInterval);
  };

  try {
    await poll();
  } catch (error) {
    logger.error({ error }, 'Failed to poll for next job');
    res.status(500).json({
      error: {
        message: 'Failed to poll for jobs',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    } as ApiError);
  }
});

/**
 * GET /api/metrics - Queue metrics (for monitoring)
 */
app.get('/api/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    const metrics = await getQueueMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error({ error }, 'Failed to get metrics');
    res.status(500).json({
      error: {
        message: 'Failed to get metrics',
        code: 'INTERNAL_ERROR',
      },
    } as ApiError);
  }
});

/**
 * Error handler
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({ error: err, path: req.path }, 'Unhandled error');
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  } as ApiError);
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
    },
  } as ApiError);
});

/**
 * Start server
 */
function startServer() {
  app.listen(PORT, () => {
    logger.info({ port: PORT, baseUrl: API_BASE_URL }, 'API server started');
  });
}

// Start server if this script is executed directly
if (require.main === module) {
  startServer();
}

export { app, startServer };
