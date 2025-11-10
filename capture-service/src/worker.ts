import { Worker, Job } from 'bullmq';
import { chromium, Browser, Page } from 'playwright';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import logger from './logger';
import { JobData, CaptureWorkerResult, JobState } from './types';
import { uploadCaptureResult, embedCaptureResult } from './storage';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  ...(process.env.REDIS_TLS === 'true' && {
    tls: {},
  }),
};

const connection = new Redis(redisConfig);

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const CAPTURE_TIMEOUT = parseInt(process.env.CAPTURE_TIMEOUT_MS || '90000', 10);
const BROWSER_HEADLESS = process.env.BROWSER_HEADLESS !== 'false';
const BROWSER_ARGS = (process.env.BROWSER_ARGS || '--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage')
  .split(',')
  .filter(Boolean);

let browser: Browser | null = null;

/**
 * Initialize browser instance
 */
async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: BROWSER_HEADLESS,
      args: BROWSER_ARGS,
    });
    logger.info({ headless: BROWSER_HEADLESS }, 'Browser launched');
  }
  return browser;
}

/**
 * Load the injected extraction script from Chrome extension
 */
function loadExtractionScript(): string {
  const scriptPath = path.join(__dirname, '../../chrome-extension/dist/injected-script.js');

  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Extraction script not found at ${scriptPath}. Run 'cd chrome-extension && npm run build' first.`);
  }

  return fs.readFileSync(scriptPath, 'utf-8');
}

/**
 * Process a single capture job
 */
async function processCaptureJob(job: Job<JobData, CaptureWorkerResult>): Promise<CaptureWorkerResult> {
  const { jobId, url, options } = job.data;
  const startTime = Date.now();

  logger.info({ jobId, url }, 'Starting capture job');

  const browser = await initBrowser();
  const context = await browser.newContext({
    viewport: options?.viewports?.[0] || { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  let page: Page | null = null;

  try {
    // Update progress: Rendering
    await job.updateProgress(10);

    page = await context.newPage();

    // Set cookies if provided
    if (options?.authentication?.cookies) {
      await context.addCookies(options.authentication.cookies);
      logger.debug({ jobId, cookieCount: options.authentication.cookies.length }, 'Cookies set');
    }

    // Navigate to URL
    logger.debug({ jobId, url }, 'Navigating to URL');
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: CAPTURE_TIMEOUT,
    });

    // Wait for custom selector if provided
    if (options?.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
    }

    // Wait for additional timeout if specified
    if (options?.waitForTimeout) {
      await page.waitForTimeout(options.waitForTimeout);
    }

    await job.updateProgress(25);

    // Inject and execute extraction script
    logger.debug({ jobId }, 'Injecting extraction script');
    const extractionScript = loadExtractionScript();

    await page.evaluate(extractionScript);

    // Execute extraction
    logger.debug({ jobId }, 'Executing DOM extraction');
    const schema = await page.evaluate(async () => {
      // @ts-ignore - injected script exposes window.DOMExtractor
      if (typeof window.DOMExtractor !== 'function') {
        throw new Error('Extraction script not loaded properly');
      }
      // @ts-ignore
      const extractor = new window.DOMExtractor();
      // @ts-ignore
      return await extractor.extractPage();
    });

    await job.updateProgress(50);

    // Take screenshot if requested
    let screenshot: string | undefined;
    if (options?.screenshot !== false) {
      logger.debug({ jobId }, 'Capturing screenshot');
      const screenshotBuffer = await page.screenshot({
        fullPage: true,
        type: 'png',
      });
      screenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
    }

    await job.updateProgress(75);

    // Calculate metadata
    const schemaJson = JSON.stringify(schema);
    const dataSizeKB = Math.round(Buffer.byteLength(schemaJson) / 1024);

    // @ts-ignore - schema structure
    const elementCount = schema?.tree?.children?.length || 0;
    // @ts-ignore
    const assetCount = Object.keys(schema?.assets?.images || {}).length;

    const workerResult: CaptureWorkerResult = {
      schema,
      screenshot,
      metadata: {
        elementCount,
        assetCount,
        dataSizeKB,
      },
    };

    // Upload to storage
    logger.debug({ jobId }, 'Uploading to storage');

    let uploadResult;
    try {
      // Try S3 upload first
      uploadResult = await uploadCaptureResult(jobId, schema, screenshot);
    } catch (error) {
      // Fallback to embedding if S3 fails
      logger.warn({ jobId, error }, 'S3 upload failed, falling back to data URI embedding');
      uploadResult = embedCaptureResult(schema, screenshot);
    }

    await job.updateProgress(100);

    const duration = Date.now() - startTime;
    logger.info(
      {
        jobId,
        url,
        duration,
        elementCount,
        assetCount,
        dataSizeKB,
      },
      'Capture job completed successfully'
    );

    return {
      ...workerResult,
      ...uploadResult,
    } as CaptureWorkerResult;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      {
        jobId,
        url,
        duration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Capture job failed'
    );
    throw error;
  } finally {
    if (page) {
      await page.close();
    }
    await context.close();
  }
}

/**
 * Initialize and start the worker
 */
async function startWorker() {
  logger.info({ concurrency: WORKER_CONCURRENCY }, 'Starting capture worker');

  // Initialize browser
  await initBrowser();

  // Create worker
  const worker = new Worker<JobData, CaptureWorkerResult>('capture', processCaptureJob, {
    connection,
    concurrency: WORKER_CONCURRENCY,
    limiter: {
      max: WORKER_CONCURRENCY,
      duration: 1000,
    },
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Worker completed job');
  });

  worker.on('failed', (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        error: error.message,
        attempts: job?.attemptsMade,
      },
      'Worker failed job'
    );
  });

  worker.on('error', (error) => {
    logger.error({ error: error.message }, 'Worker error');
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down worker');
    await worker.close();
    if (browser) {
      await browser.close();
    }
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down worker');
    await worker.close();
    if (browser) {
      await browser.close();
    }
    process.exit(0);
  });

  logger.info('Capture worker started and ready for jobs');
}

// Start worker if this script is executed directly
if (require.main === module) {
  startWorker().catch((error) => {
    logger.error({ error }, 'Failed to start worker');
    process.exit(1);
  });
}

export { startWorker, processCaptureJob };
