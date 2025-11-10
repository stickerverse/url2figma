# Quick Railway Deployment Guide

## 🚀 **Your Service is Ready for Deployment!**

### **1. Manual Railway Deployment**

1. **Go to [railway.app](https://railway.app)** and create account
2. **Create New Project** → Deploy from GitHub repo
3. **Connect your GitHub** (push this code to a repo first)
4. **Set Environment Variables** in Railway dashboard:

```
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here  
S3_BUCKET=figma-capture-assets
ALLOWED_API_KEYS=your_secure_api_key_here
REDIS_HOST=${{REDIS.PRIVATE_URL}}
API_BASE_URL=${{RAILWAY_STATIC_URL}}
NODE_ENV=production
```

5. **Add Redis Service** in Railway dashboard (click "Add Service" → "Add Database" → "Redis")

### **2. Alternative: Local Testing First**

Your service is already configured and working locally:

```bash
cd capture-service
npm start  # Runs on http://localhost:3000
```

**Test it works:**
```bash
curl -X POST http://localhost:3000/api/capture \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key_here" \
  -d '{"url": "https://example.com", "options": {"screenshot": true}}'
```

### **3. Update Plugin After Deployment**

Once deployed to Railway, update `figma-plugin/src/code-clean.ts`:

```typescript
const cloudClient = new CloudServiceClient({
  apiBaseUrl: 'https://your-railway-url.up.railway.app', // ← Update this
  apiKey: 'your_api_key_here',
});
```

## ✅ **What's Already Done:**
- ✅ AWS S3 credentials configured
- ✅ API keys generated
- ✅ Local Redis working
- ✅ Service builds and starts successfully
- ✅ Environment variables ready for deployment

**You're ready to deploy! Just need to push to Railway manually.**