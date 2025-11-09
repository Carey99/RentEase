# 🚀 RentEase Deployment Guide

Complete guide to deploy RentEase on Render.com with MongoDB Atlas and Paystack integration.

---

## 📋 Prerequisites Checklist

Before deploying, ensure you have:

- [ ] GitHub account (to push code)
- [ ] Render.com account (free tier works)
- [ ] MongoDB Atlas account with cluster created
- [ ] Paystack account (test mode is fine for now)
- [ ] Domain name (optional, Render provides free subdomain)

---

## 🗄️ Step 1: MongoDB Atlas Setup

### 1.1 Create MongoDB Atlas Cluster
1. Go to https://cloud.mongodb.com
2. Sign up or log in
3. Create a **FREE** M0 cluster (512 MB storage)
4. Choose region closest to your users (e.g., AWS Ireland for Kenya)
5. Name your cluster: `RentEase-Prod`

### 1.2 Configure Network Access
1. In Atlas, go to **Network Access** → **Add IP Address**
2. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - This is safe because we use authentication
3. Click **Confirm**

### 1.3 Create Database User
1. Go to **Database Access** → **Add New Database User**
2. Choose **Password** authentication
3. Username: `rentease_admin`
4. Password: Generate a strong password (save it securely!)
5. Database User Privileges: **Atlas Admin** or **Read and Write to any database**
6. Click **Add User**

### 1.4 Get Connection String
1. Go to **Database** → Click **Connect** on your cluster
2. Choose **Connect your application**
3. Driver: **Node.js**, Version: **5.5 or later**
4. Copy the connection string (looks like):
   ```
   mongodb+srv://rentease_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Replace `<password>`** with your actual password
6. Save this securely - you'll need it for Render

---

## 🎨 Step 2: Paystack Setup

### 2.1 Create Paystack Account
1. Go to https://paystack.com
2. Sign up (Business Account recommended)
3. Verify your email
4. Complete business verification (needed for live payments)

### 2.2 Get API Keys
1. Log in to Paystack Dashboard
2. Go to **Settings** → **API Keys & Webhooks**
3. Copy your **Test Public Key** (starts with `pk_test_`)
4. Copy your **Test Secret Key** (starts with `sk_test_`)
5. Save these securely

### 2.3 Configure Webhook (Do this AFTER deploying)
We'll set this up after deployment since we need the Render URL.

---

## 🔨 Step 3: Prepare for Deployment

### 3.1 Test Build Locally
Run these commands to ensure everything builds correctly:

```bash
# Install dependencies
npm install

# Test production build
npm run build

# Test production server (optional)
npm start
```

If you see any errors, fix them before deploying.

### 3.2 Create .gitignore (If not exists)
Ensure these files are in `.gitignore`:

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

### 3.3 Commit Your Code
```bash
git add .
git commit -m "Prepare for deployment - added Paystack integration"
```

---

## 🚀 Step 4: Deploy to Render

### 4.1 Push to GitHub
```bash
# First time setup
git remote add origin https://github.com/Carey99/RentEase.git
git branch -M main
git push -u origin main

# Subsequent pushes
git push
```

### 4.2 Connect Render to GitHub
1. Go to https://dashboard.render.com
2. Sign up with GitHub (easiest method)
3. Authorize Render to access your repositories

### 4.3 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `Carey99/RentEase`
3. Render will auto-detect it's a Node.js app

### 4.4 Configure Web Service

**Basic Settings:**
- **Name**: `rentease` (or your preferred name)
- **Region**: Choose closest to your users (Oregon, Frankfurt, Singapore)
- **Branch**: `main`
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

**Instance Type:**
- Select **Free** (or upgrade to Starter $7/month for better performance)

### 4.5 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these variables one by one:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render default |
| `MONGODB_URL` | `mongodb+srv://rentease_admin:...` | Your Atlas connection string |
| `DATABASE_NAME` | `RentFlow` | Database name |
| `JWT_SECRET` | Click "Generate" | Render auto-generates |
| `FRONTEND_URL` | `https://rentease-e5g5.onrender.com` | Your deployed app URL |
| `PAYSTACK_PUBLIC_KEY` | `pk_test_xxxxx` | From Paystack dashboard |
| `PAYSTACK_SECRET_KEY` | `sk_test_xxxxx` | From Paystack dashboard |
| `PAYSTACK_WEBHOOK_SECRET` | `whsec_xxxxx` | Add after webhook setup |
| `PAYSTACK_ENV` | `test` | Use 'test' initially |

**⚠️ Important**: 
- Replace `rentease` in `FRONTEND_URL` with your actual Render service name
- Keep `PAYSTACK_WEBHOOK_SECRET` empty for now (we'll add it after webhook setup)

### 4.6 Deploy
1. Click **"Create Web Service"**
2. Render will start building and deploying (takes 3-5 minutes)
3. Watch the logs for any errors
4. Once deployed, you'll get a URL like: `https://rentease-e5g5.onrender.com`

---

## ✅ Step 5: Verify Deployment

### 5.1 Check Health Endpoint
Visit: `https://rentease-e5g5.onrender.com/health`

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-09T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### 5.2 Test the Application
1. Visit: `https://rentease-e5g5.onrender.com`
2. You should see the RentEase landing page
3. Try signing in with test credentials:
   - Landlord: `landlord@example.com` / `password123`
   - Tenant: `tenant@example.com` / `password123`

### 5.3 Check Database Connection
- If you can log in, database is working! ✅
- If not, check Render logs: **Dashboard → Your Service → Logs**

---

## 🔗 Step 6: Configure Paystack Webhook

### 6.1 Set Up Webhook Endpoint
1. Log in to Paystack Dashboard
2. Go to **Settings** → **API Keys & Webhooks**
3. Scroll to **Webhook URL**
4. Enter: `https://rentease-e5g5.onrender.com/api/webhooks/paystack`
5. Click **Save**

### 6.2 Get Webhook Secret
1. After saving, Paystack shows a **Webhook Secret**
2. Copy the secret (starts with `whsec_`)
3. Go to Render Dashboard → Your Service → **Environment**
4. Find `PAYSTACK_WEBHOOK_SECRET` and click **Edit**
5. Paste the webhook secret
6. Click **Save Changes**
7. Render will auto-redeploy with the new variable

### 6.3 Test Webhook
1. In Paystack Dashboard, find **"Test Webhook"** button
2. Send a test event
3. Check Render logs to see if webhook was received
4. You should see logs like: `✅ Webhook received from Paystack`

---

## 🌐 Step 7: Custom Domain (Optional)

### 7.1 Purchase Domain
- Recommended: Namecheap, Google Domains, Cloudflare
- Example: `rentease.co.ke` or `rentease.com`

### 7.2 Configure in Render
1. In Render Dashboard → Your Service → **Settings**
2. Scroll to **Custom Domain**
3. Click **Add Custom Domain**
4. Enter your domain: `www.rentease.co.ke`
5. Render provides CNAME/A record instructions

### 7.3 Update DNS Records
In your domain registrar:
- Add CNAME record: `www` → `your-app.onrender.com`
- Or A record: `@` → Render's IP address

### 7.4 Enable HTTPS
- Render automatically provisions free SSL certificate via Let's Encrypt
- Wait 10-15 minutes for DNS propagation
- Your site will be accessible via `https://www.rentease.co.ke`

### 7.5 Update Environment Variables
1. In Render, update `FRONTEND_URL` to your custom domain
2. In Paystack Dashboard, update webhook URL to use custom domain

---

## 🔐 Step 8: Security & Production Readiness

### 8.1 Switch to Production Paystack Keys
1. Complete Paystack business verification
2. Get approval from Paystack team
3. In Render, update:
   - `PAYSTACK_PUBLIC_KEY` → Live public key (`pk_live_xxxxx`)
   - `PAYSTACK_SECRET_KEY` → Live secret key (`sk_live_xxxxx`)
   - `PAYSTACK_ENV` → `live`

### 8.2 Database Backup
1. In MongoDB Atlas → **Backup** tab
2. Enable **Cloud Backups** (recommended)
3. Set backup frequency: Daily

### 8.3 Monitor Application
**Render Monitoring:**
- Check **Metrics** tab for CPU/Memory usage
- Set up **Alerts** for downtime

**Error Tracking (Optional):**
- Integrate Sentry: https://sentry.io
- Get real-time error notifications

---

## 🐛 Troubleshooting

### Build Fails
**Error**: `npm install failed`
- **Fix**: Check package.json for correct dependencies
- **Fix**: Ensure Node version compatibility (18+)

### Cannot Connect to Database
**Error**: `MongoNetworkError: connection timeout`
- **Fix**: Check MongoDB Atlas IP whitelist (should be 0.0.0.0/0)
- **Fix**: Verify MONGODB_URL is correct (including password)

### App Crashes on Start
**Error**: `Application failed to start`
- **Fix**: Check Render logs for specific error
- **Fix**: Verify all required environment variables are set
- **Fix**: Test build locally first with `npm run build && npm start`

### Webhook Not Working
**Error**: Webhook events not received
- **Fix**: Verify webhook URL in Paystack dashboard
- **Fix**: Check PAYSTACK_WEBHOOK_SECRET is set correctly
- **Fix**: Look for webhook logs in Render logs

### CORS Errors
**Error**: `Access-Control-Allow-Origin`
- **Fix**: Update FRONTEND_URL to match your deployed URL
- **Fix**: Ensure app is redeployed after changing env vars

---

## 📊 Post-Deployment Checklist

After successful deployment:

- [ ] Health check endpoint works
- [ ] Can access landing page
- [ ] Can sign in as landlord
- [ ] Can sign in as tenant
- [ ] Database connection working
- [ ] Paystack webhook receiving events
- [ ] All payment flows tested
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (HTTPS)
- [ ] Monitoring and alerts set up

---

## 🔄 Continuous Deployment

### Automatic Deployments
Render automatically deploys when you push to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Add new feature"
git push

# Render automatically:
# 1. Detects the push
# 2. Runs build command
# 3. Deploys new version
# 4. Zero-downtime deployment
```

### Manual Deployments
In Render Dashboard:
1. Go to your service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Or **"Clear build cache & deploy"** if having issues

---

## 💰 Pricing

### Free Tier
- ✅ 750 hours/month (enough for 1 app)
- ✅ Auto-sleep after 15 minutes of inactivity
- ✅ 100 GB bandwidth
- ⚠️ Spins down when inactive (30-60s cold start)

### Paid Tiers
- **Starter ($7/month)**: No sleep, 400 GB bandwidth
- **Standard ($25/month)**: 2x resources, 1000 GB bandwidth
- **Pro ($85/month)**: 4x resources, 2000 GB bandwidth

**Recommendation**: Start with **Free**, upgrade to **Starter** when you have paying customers.

---

## 📞 Support

- **Render Support**: https://render.com/docs
- **MongoDB Atlas Support**: https://www.mongodb.com/docs/atlas
- **Paystack Support**: support@paystack.com or https://paystack.com/docs

---

**Last Updated**: November 9, 2025  
**Deployed By**: Carey  
**Status**: ✅ Ready for Production

---

## 🎉 Congratulations!

Your RentEase application is now live and ready to accept rent payments via M-Pesa! 🚀

Next steps:
1. Test all features thoroughly
2. Onboard your first landlord
3. Process your first rent payment
4. Monitor application performance
5. Gather user feedback
6. Iterate and improve!
