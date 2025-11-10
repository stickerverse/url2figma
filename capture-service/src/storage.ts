import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from './logger';
import { AssetUploadResult } from './types';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }
    
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3Client;
}

const BUCKET_NAME = process.env.S3_BUCKET || 'figma-capture-assets';
const ASSET_EXPIRY_HOURS = parseInt(process.env.S3_ASSET_EXPIRY_HOURS || '24', 10);

/**
 * Check if S3 bucket is accessible
 */
export async function checkStorageHealth(): Promise<boolean> {
  try {
    const client = getS3Client();
    await client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    return true;
  } catch (error) {
    logger.error({ error, bucket: BUCKET_NAME }, 'S3 bucket not accessible');
    return false;
  }
}

/**
 * Upload capture result to S3 and generate signed URLs
 */
export async function uploadCaptureResult(
  jobId: string,
  schema: unknown,
  screenshot?: string
): Promise<AssetUploadResult> {
  const schemaKey = `captures/${jobId}/schema.json`;
  const screenshotKey = screenshot ? `captures/${jobId}/screenshot.png` : undefined;

  try {
    const client = getS3Client();
    
    // Upload schema JSON
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: schemaKey,
        Body: JSON.stringify(schema),
        ContentType: 'application/json',
        Metadata: {
          jobId,
          capturedAt: new Date().toISOString(),
        },
      })
    );

    logger.info({ jobId, key: schemaKey }, 'Schema uploaded to S3');

    // Upload screenshot if provided
    if (screenshot && screenshotKey) {
      const screenshotBuffer = Buffer.from(screenshot.replace(/^data:image\/\w+;base64,/, ''), 'base64');

      await client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: screenshotKey,
          Body: screenshotBuffer,
          ContentType: 'image/png',
          Metadata: {
            jobId,
          },
        })
      );

      logger.info({ jobId, key: screenshotKey }, 'Screenshot uploaded to S3');
    }

    // Generate signed URLs
    const expiresIn = ASSET_EXPIRY_HOURS * 3600; // seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const schemaUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: schemaKey,
      }),
      { expiresIn }
    );

    let screenshotUrl: string | undefined;
    if (screenshotKey) {
      screenshotUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: screenshotKey,
        }),
        { expiresIn }
      );
    }

    logger.info({ jobId, expiresAt }, 'Generated signed URLs for assets');

    return {
      schemaUrl,
      screenshotUrl,
      expiresAt,
    };
  } catch (error) {
    logger.error({ error, jobId }, 'Failed to upload capture result to S3');
    throw new Error(`Storage upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Alternative: Return base64-embedded schema (for small payloads < 5MB)
 * Use this when S3 is not configured or for development
 */
export function embedCaptureResult(schema: unknown, screenshot?: string): AssetUploadResult {
  const schemaJson = JSON.stringify(schema);
  const schemaSizeKB = Buffer.byteLength(schemaJson) / 1024;

  if (schemaSizeKB > 5000) {
    throw new Error(`Schema too large for embedding: ${schemaSizeKB.toFixed(0)} KB (max 5 MB)`);
  }

  const schemaUrl = `data:application/json;base64,${Buffer.from(schemaJson).toString('base64')}`;
  const screenshotUrl = screenshot || undefined;
  const expiresAt = new Date(Date.now() + ASSET_EXPIRY_HOURS * 3600 * 1000).toISOString();

  logger.info({ schemaSizeKB: schemaSizeKB.toFixed(1) }, 'Embedded schema as data URI');

  return {
    schemaUrl,
    screenshotUrl,
    expiresAt,
  };
}

logger.info({ bucket: BUCKET_NAME, expiryHours: ASSET_EXPIRY_HOURS }, 'Storage module initialized');
