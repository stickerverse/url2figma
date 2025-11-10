import { z } from 'zod';

/**
 * Capture request schema validation
 */
export const CaptureRequestSchema = z.object({
  url: z.string().url('Invalid URL format'),
  options: z
    .object({
      viewports: z
        .array(
          z.object({
            width: z.number().int().min(320).max(3840),
            height: z.number().int().min(240).max(2160),
            name: z.string().optional(),
          })
        )
        .min(1)
        .max(5)
        .optional()
        .default([{ width: 1920, height: 1080 }]),
      waitForSelector: z.string().optional(),
      waitForTimeout: z.number().int().min(0).max(30000).optional(),
      screenshot: z.boolean().optional().default(true),
      applyAutoLayout: z.boolean().optional().default(true),
      extractComponents: z.boolean().optional().default(true),
      extractVariants: z.boolean().optional().default(false),
      authentication: z
        .object({
          cookies: z.array(
            z.object({
              name: z.string(),
              value: z.string(),
              domain: z.string(),
              path: z.string().optional(),
            })
          ),
        })
        .optional(),
    })
    .optional()
    .default({}),
});

export type CaptureRequest = z.infer<typeof CaptureRequestSchema>;

/**
 * Job states in the capture pipeline
 */
export enum JobState {
  QUEUED = 'queued',
  RENDERING = 'rendering',
  EXTRACTING = 'extracting',
  PACKAGING = 'packaging',
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Job data structure
 */
export interface JobData extends CaptureRequest {
  jobId: string;
  createdAt: string;
  apiKey?: string;
}

/**
 * Job result structure
 */
export interface JobResult {
  jobId: string;
  state: JobState;
  progress: number;
  createdAt: string;
  completedAt?: string;
  schemaUrl?: string;
  screenshotUrl?: string;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
  metadata?: {
    url: string;
    viewports: Array<{ width: number; height: number; name?: string }>;
    elementCount: number;
    assetCount: number;
    dataSizeKB: number;
  };
}

/**
 * Capture worker result
 */
export interface CaptureWorkerResult {
  schema: unknown; // WebToFigmaSchema
  screenshot?: string; // base64
  metadata: {
    elementCount: number;
    assetCount: number;
    dataSizeKB: number;
  };
}

/**
 * Asset storage result
 */
export interface AssetUploadResult {
  schemaUrl: string;
  screenshotUrl?: string;
  expiresAt: string;
}

/**
 * API error response
 */
export interface ApiError {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;
  services: {
    redis: boolean;
    storage: boolean;
    workers: {
      active: number;
      waiting: number;
      failed: number;
    };
  };
}
