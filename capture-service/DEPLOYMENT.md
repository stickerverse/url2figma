                                                                                                                                                                                                                                                                                                                                                                                                                            # Deployment Guide

## Prerequisites

1. **Chrome Extension Built**
   ```bash
   cd chrome-extension
   npm install
   npm run build
   ```
   This creates `chrome-extension/dist/injected-script.js` which workers need.

2. **Infrastructure**
   - Redis server (6.x or 7.x)
   - S3-compatible storage (AWS S3, MinIO, DigitalOcean Spaces, etc.)
   - Container orchestration (Docker Compose, Kubernetes, or ECS)

## Option 1: Docker Compose (Recommended for Testing)

### Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure environment variables:
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   S3_BUCKET=figma-capture-assets
   ALLOWED_API_KEYS=secret-key-1,secret-key-2
   WORKER_CONCURRENCY=3
   ```

3. Build and start services:
   ```bash
   docker-compose up -d
   ```

4. Verify health:
   ```bash
   curl http://localhost:3000/health
   ```

### Scaling Workers

Edit `docker-compose.yml`:
```yaml
worker:
  deploy:
    replicas: 5  # Increase from 2 to 5
```

Then:
```bash
docker-compose up -d --scale worker=5
```

## Option 2: Kubernetes

### Manifests

Create namespace:
```bash
kubectl create namespace figma-capture
```

Deploy Redis:
```yaml
# k8s/redis-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: figma-capture
spec:
  serviceName: redis
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: figma-capture
spec:
  ports:
  - port: 6379
  selector:
    app: redis
```

Deploy API:
```yaml
# k8s/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: capture-api
  namespace: figma-capture
spec:
  replicas: 2
  selector:
    matchLabels:
      app: capture-api
  template:
    metadata:
      labels:
        app: capture-api
    spec:
      containers:
      - name: api
        image: your-registry/figma-capture-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_HOST
          value: redis
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key-id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-access-key
        - name: S3_BUCKET
          value: figma-capture-assets
        - name: ALLOWED_API_KEYS
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: allowed-keys
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: capture-api
  namespace: figma-capture
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: capture-api
```

Deploy Workers:
```yaml
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: capture-worker
  namespace: figma-capture
spec:
  replicas: 3
  selector:
    matchLabels:
      app: capture-worker
  template:
    metadata:
      labels:
        app: capture-worker
    spec:
      containers:
      - name: worker
        image: your-registry/figma-capture-service:latest
        command: ["node", "dist/worker.js"]
        env:
        - name: REDIS_HOST
          value: redis
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key-id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-access-key
        - name: S3_BUCKET
          value: figma-capture-assets
        - name: WORKER_CONCURRENCY
          value: "3"
        resources:
          requests:
            memory: "1Gi"
            cpu: "1"
          limits:
            memory: "2Gi"
            cpu: "2"
```

HPA for workers:
```yaml
# k8s/worker-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: capture-worker-hpa
  namespace: figma-capture
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: capture-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Apply all:
```bash
kubectl apply -f k8s/
```

## Option 3: AWS (Serverless + ECS)

### Architecture

- **API**: Lambda + API Gateway
- **Workers**: ECS Fargate tasks
- **Queue**: Redis Elasticache
- **Storage**: S3
- **CDN**: CloudFront (for schema/screenshot delivery)

### Setup

1. **Create S3 bucket**:
   ```bash
   aws s3 mb s3://figma-capture-assets
   aws s3api put-bucket-cors --bucket figma-capture-assets --cors-configuration file://s3-cors.json
   ```

2. **Deploy Redis Elasticache**:
   ```bash
   aws elasticache create-cache-cluster \
     --cache-cluster-id figma-capture-redis \
     --engine redis \
     --cache-node-type cache.t3.micro \
     --num-cache-nodes 1
   ```

3. **Deploy API via Lambda**:
   - Use AWS SAM or Serverless Framework
   - API Gateway HTTP API → Lambda function
   - VPC connection to Elasticache

4. **Deploy workers via ECS**:
   - Create ECS cluster
   - Task definition with Fargate
   - Service with auto-scaling

See `aws/` directory for CloudFormation templates.

## Option 4: DigitalOcean App Platform

```yaml
# .do/app.yaml
name: figma-capture-service
services:
- name: api
  github:
    repo: your-org/figma-capture
    branch: main
    deploy_on_push: true
  build_command: npm run build
  run_command: npm start
  envs:
  - key: REDIS_HOST
    value: ${redis.HOSTNAME}
  - key: AWS_ACCESS_KEY_ID
    value: ${AWS_ACCESS_KEY_ID}
    type: SECRET
  - key: AWS_SECRET_ACCESS_KEY
    value: ${AWS_SECRET_ACCESS_KEY}
    type: SECRET
  - key: S3_BUCKET
    value: figma-capture-assets
  http_port: 3000
  instance_count: 2

- name: worker
  github:
    repo: your-org/figma-capture
    branch: main
  build_command: npm run build
  run_command: node dist/worker.js
  envs:
  - key: REDIS_HOST
    value: ${redis.HOSTNAME}
  - key: WORKER_CONCURRENCY
    value: "3"
  instance_count: 2
  instance_size_slug: professional-m

databases:
- name: redis
  engine: REDIS
  version: "7"
```

Deploy:
```bash
doctl apps create --spec .do/app.yaml
```

## Post-Deployment

### 1. Configure Figma Plugin

Set environment variables before building:
```bash
export CAPTURE_SERVICE_URL=https://capture.yourdomain.com
export CAPTURE_SERVICE_API_KEY=your-api-key
cd figma-plugin
npm run build
```

Or update `figma-plugin/src/code.ts` directly.

### 2. Test End-to-End

```bash
# Submit job
curl -X POST https://capture.yourdomain.com/api/capture \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "url": "https://example.com",
    "options": {
      "screenshot": true
    }
  }'

# Response: {"jobId":"abc123",...}

# Check status
curl https://capture.yourdomain.com/api/jobs/abc123 \
  -H "x-api-key: your-api-key"

# Wait for state: "completed", then schemaUrl will be available
```

### 3. Monitor

- Health check: `GET /health`
- Metrics: `GET /api/metrics`
- Logs: Check container/pod logs
- Queue: Monitor Redis keys

### 4. SSL/TLS

Use a reverse proxy (Nginx, Caddy) or cloud load balancer with SSL termination:

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name capture.yourdomain.com;

    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

### Workers not processing jobs

Check:
1. Redis connectivity: `redis-cli ping`
2. Worker logs: `docker-compose logs worker`
3. Chrome extension built: `ls chrome-extension/dist/injected-script.js`

### S3 upload failures

Check IAM permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::figma-capture-assets/*"
    }
  ]
}
```

### High memory usage

Reduce worker concurrency:
```env
WORKER_CONCURRENCY=2
```

Or increase container memory limits.

## Monitoring & Alerting

### Prometheus Metrics

Add Prometheus exporter (future enhancement):
```typescript
// src/metrics.ts
import promClient from 'prom-client';

export const jobsProcessed = new promClient.Counter({
  name: 'jobs_processed_total',
  help: 'Total number of jobs processed'
});

export const jobDuration = new promClient.Histogram({
  name: 'job_duration_seconds',
  help: 'Job processing duration'
});
```

### Log Aggregation

Use structured logging with Pino:
```bash
# Ship logs to Datadog
LOG_LEVEL=info npm start | datadog-agent

# Or Elasticsearch
npm start | filebeat
```

### Health Checks

Kubernetes liveness probe already configured. For external monitoring:
```bash
# UptimeRobot
curl https://capture.yourdomain.com/health

# Expected: {"status":"ok",...}
```

## Cost Optimization

1. **Use spot instances for workers** (ECS Fargate Spot, Kubernetes node pools)
2. **Scale to zero** during off-hours with KEDA (Kubernetes Event-Driven Autoscaling)
3. **Cache identical URLs** (add Redis cache with TTL)
4. **Compress assets** (gzip schemas before S3 upload)
5. **S3 lifecycle policies** (expire old captures after 7 days)

## Security Checklist

- [ ] API keys rotated and stored securely
- [ ] Rate limiting enabled
- [ ] HTTPS/TLS configured
- [ ] CORS restricted to Figma domains
- [ ] Container runs as non-root user
- [ ] Network egress restricted (optional)
- [ ] S3 bucket not publicly accessible
- [ ] Secrets in environment variables (not code)
- [ ] Regular security updates (Playwright, Node.js)
