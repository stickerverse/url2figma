# 🚀 One-Click Railway Deployment

## ✨ **Automatic Setup - All Environment Variables Included!**

Your cloud capture service is now configured for **automatic deployment** with all environment variables pre-configured!

### **🎯 One-Click Deploy**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/lYxWDO?referralCode=figma)

**OR**

### **📋 Manual Deploy Steps:**

#### **1. Deploy to Railway**
```bash
# Option A: Use Railway Template (Automatic)
1. Click: https://railway.app/template/lYxWDO
2. Connect GitHub account
3. Select repository: stickerverse/url2figma  
4. Deploy automatically!

# Option B: Manual deployment
1. Go to railway.app
2. New Project → Deploy from GitHub
3. Select: stickerverse/url2figma
4. Root directory: capture-service/
```

#### **2. Environment Variables (Auto-Configured!)**

✅ **All environment variables are automatically set via `railway.toml` and `.env.production`**

No manual configuration needed! The following are pre-configured:

```bash
# ✅ Pre-configured automatically
NODE_ENV=production
S3_BUCKET=figma-capture-assets
API_KEY_REQUIRED=true
REDIS_HOST=${{REDIS.PRIVATE_URL}}
API_BASE_URL=${{RAILWAY_STATIC_URL}}
# + 15 other variables automatically configured
```

**🔐 Secure Variables (Set these in Railway Dashboard → Variables):**
```bash
AWS_ACCESS_KEY_ID=<your_aws_access_key>  
AWS_SECRET_ACCESS_KEY=<your_aws_secret_key>
ALLOWED_API_KEYS=<your_secure_api_key>
```

ℹ️ **Contact repository owner for the actual credential values**

#### **3. Add Redis (One Click)**
1. In Railway dashboard → **"Add Service"** 
2. **"Add Database"** → **"Redis"**
3. Done! Auto-connects via `${{REDIS.PRIVATE_URL}}`

### **🎉 That's It!**

Your service will be live at: `https://your-app-name.up.railway.app`

### **✅ What Gets Deployed Automatically:**

- 🚀 **Express API Server** with capture endpoints
- 📦 **BullMQ Job Queue** with Redis
- 🌐 **Playwright Browser** with Chromium  
- ☁️ **AWS S3 Integration** for asset storage
- 🔐 **API Authentication** and rate limiting
- 📊 **Health monitoring** and logging
- 🏗️ **Auto-scaling** worker processes

### **🔧 After Deployment:**

1. **Copy your Railway URL** (e.g., `https://your-app.up.railway.app`)

2. **Update Figma Plugin** (file: `figma-plugin/src/code.ts`):
```typescript
const CAPTURE_SERVICE_URL = 'https://your-actual-railway-url.up.railway.app';
```

3. **Rebuild and test:**
```bash
cd figma-plugin && npm run build
```

### **🧪 Test Your Deployment:**

```bash
# Health check
curl https://your-app.up.railway.app/health

# Test capture (replace URL with yours)
curl -X POST https://your-app.up.railway.app/api/capture \
  -H "Content-Type: application/json" \
  -H "x-api-key: f7df13dd6f622998e79f8ec581cc2f4dc908331cadb426b74ac4b8879d186da2" \
  -d '{"url": "https://example.com"}'
```

### **💰 Cost Estimate:**
- **API Service:** ~$5-10/month
- **Redis:** ~$5/month  
- **S3 Storage:** ~$1-5/month
- **Total:** ~$10-20/month

### **🆘 Troubleshooting:**

**If deployment fails:**
- Check Railway logs in dashboard
- Verify GitHub connection
- Ensure capture-service/ folder is detected

**If captures fail:**
- Test health endpoint first
- Check browser installation in logs  
- Verify S3 permissions

**If Figma plugin doesn't connect:**
- Verify Railway URL in plugin code
- Check API key matches
- Test manual curl requests

### **🏆 Success Criteria:**

✅ Railway service shows "Deployed"  
✅ Health endpoint returns `{"status":"ok"}`  
✅ Figma plugin connects and shows green LED  
✅ Test capture completes successfully  

**You now have a production-ready cloud service that rivals html.to.design!** 🎉