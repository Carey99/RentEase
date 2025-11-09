# 🚀 Pre-Deployment Checklist

Before deploying RentEase to Render, verify all items below:

## ✅ Code Quality

- [x] All TypeScript errors resolved (`npm run check`)
- [x] Production build works (`npm run build`)
- [x] No sensitive data in code (passwords, API keys)
- [x] Environment variables properly configured
- [x] CORS configured for production
- [x] Health check endpoint working

## ✅ Environment Setup

### MongoDB Atlas
- [ ] MongoDB Atlas cluster created
- [ ] IP whitelist configured (0.0.0.0/0)
- [ ] Database user created with strong password
- [ ] Connection string tested and saved

### Paystack
- [ ] Paystack account created
- [ ] Test API keys obtained (pk_test_xxx, sk_test_xxx)
- [ ] Business details submitted for verification
- [ ] (Later) Webhook URL will be configured after deployment

### GitHub
- [ ] Code pushed to GitHub repository
- [ ] Repository is accessible
- [ ] Main branch is up to date

## ✅ Configuration Files

- [x] `.env.example` updated with all variables
- [x] `.env.production.example` created
- [x] `.gitignore` includes `.env` and sensitive files
- [x] `render.yaml` deployment configuration created
- [x] `DEPLOYMENT.md` documentation complete
- [x] `README.md` updated with deployment info

## ✅ Application Features

- [x] Authentication working (login/register)
- [x] Property management functional
- [x] Tenant management functional
- [x] Payment history displaying correctly
- [x] Real-time notifications working
- [x] WebSocket connections stable

## ✅ Build & Deploy

- [x] `npm install` completes without errors
- [x] `npm run build` succeeds
- [x] `npm start` runs production server
- [x] Health endpoint returns 200 OK
- [x] No console errors in production mode

## 📋 Environment Variables for Render

Copy these to Render dashboard:

```
NODE_ENV=production
PORT=10000
MONGODB_URL=<your-atlas-connection-string>
DATABASE_NAME=RentFlow
JWT_SECRET=<generate-secure-secret>
FRONTEND_URL=https://your-app.onrender.com
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_WEBHOOK_SECRET=<add-after-webhook-setup>
PAYSTACK_ENV=test
```

## 🚀 Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create Render Service**
   - Go to https://dashboard.render.com
   - New → Web Service
   - Connect GitHub repository
   - Use settings from `render.yaml`

3. **Add Environment Variables**
   - Copy from `.env.production.example`
   - Update with your actual credentials
   - Save and deploy

4. **Verify Deployment**
   - Check build logs for errors
   - Visit deployed URL
   - Test health endpoint: `https://your-app.onrender.com/health`
   - Test login functionality
   - Verify database connection

5. **Configure Paystack Webhook**
   - Get deployed URL from Render
   - Add webhook in Paystack dashboard
   - Update `PAYSTACK_WEBHOOK_SECRET` in Render
   - Test webhook with Paystack test event

## ⚠️ Important Notes

- **Free Tier**: App sleeps after 15 minutes of inactivity (30-60s cold start)
- **Database**: Ensure MongoDB Atlas IP whitelist is set to 0.0.0.0/0
- **HTTPS**: Render provides free SSL automatically
- **Domain**: Update `FRONTEND_URL` if using custom domain
- **Monitoring**: Check Render logs regularly after deployment

## 🐛 Common Issues

### Build Fails
- Check `package.json` scripts
- Verify all dependencies are listed
- Check Node.js version compatibility

### Database Connection Error
- Verify MongoDB Atlas connection string
- Check IP whitelist in Atlas
- Ensure database user has correct permissions

### CORS Errors
- Update `FRONTEND_URL` to match deployed URL
- Restart service after updating env vars

### Webhook Not Working
- Verify webhook URL in Paystack dashboard
- Check `PAYSTACK_WEBHOOK_SECRET` is set
- Look for webhook events in Render logs

## ✨ Post-Deployment

After successful deployment:

- [ ] Health check endpoint returns 200
- [ ] Can access landing page
- [ ] Can log in as landlord
- [ ] Can log in as tenant
- [ ] Database operations working
- [ ] Paystack webhook receiving events
- [ ] Real-time notifications working
- [ ] No errors in Render logs

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas Docs**: https://www.mongodb.com/docs/atlas
- **Paystack Docs**: https://paystack.com/docs
- **GitHub Issues**: Create an issue for bugs or questions

---

**Ready to deploy?** Follow the detailed guide in [DEPLOYMENT.md](./DEPLOYMENT.md)

**Last Updated**: November 9, 2025
