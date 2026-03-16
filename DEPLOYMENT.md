# SkillShare Hub - Deployment Guide

## Current Status
- ✅ **Backend**: Deployed on Render
  - URL: https://skill-hub-il65.onrender.com/
  - Admin: http://127.0.0.1:8000/admin/ (local)
  - Live admin: https://skill-hub-il65.onrender.com/admin/

- ✅ **Frontend**: Ready for Vercel deployment
  - Production build created
  - API endpoints configured
  - React app built in `frontend/build/`

---

## Vercel Frontend Deployment Steps

### Step 1: Prepare GitHub
Your code is already pushed to GitHub. The `frontend/.env.production` file is configured with:
```
REACT_APP_API_BASE=https://skill-hub-il65.onrender.com
```

### Step 2: Connect to Vercel
1. Go to **https://vercel.com**
2. Click **"Sign in"** or **"Learn More"** → Log in with GitHub
3. Click **"Create Team"** or go directly to **"New Project"**

### Step 3: Import Project
1. Click **"Add New..."** → **"Project"**
2. Find and select **`gaganrai200505-rgb/Skill-hub`** repository
3. Click **"Import"**

### Step 4: Configure Project Settings
1. **Framework Preset**: Select **React**
2. **Root Directory**: Click **"Edit"** and set to **`frontend`**
3. **Build Command**: Keep default `npm run build`
4. **Output Directory**: Keep default `.next` (Vercel auto-detects `build/`)
5. **Install Command**: Keep default `npm install`

### Step 5: Environment Variables
1. Click **"Environment Variables"**
2. Add the following:
   ```
   Name: REACT_APP_API_BASE
   Value: https://skill-hub-il65.onrender.com
   ```
3. Make sure it applies to **Production**, **Preview**, and **Development**

### Step 6: Deploy
1. Click **"Deploy"** button
2. Wait 2-5 minutes for Vercel to build and deploy
3. You'll get a URL like: `https://skill-hub.vercel.app/`

---

## Verify Deployment

### Test Frontend
- Visit your Vercel URL in browser
- Navigate to different pages
- Open Developer Console (F12) → **Network** tab
- Check that API calls go to: `https://skill-hub-il65.onrender.com/api/...`

### Test Login
1. Go to `/login` page
2. Try logging in with existing credentials (_e.g._, demo1 / password)
3. Should redirect to `/dashboard` or `/profile`

### Check Admin Access
- Frontend users should be able to access admin dashboard link (if available)
- Direct access: `https://skill-hub-il65.onrender.com/admin/`

---

## Backend Configuration Verification

Your Django backend is already configured for production:

✅ **Settings.py**
- `SECRET_KEY` from environment variable
- `DEBUG = False` in production  
- `ALLOWED_HOSTS` includes: `skill-hub-il65.onrender.com`
- `CORS_ALLOWED_ORIGINS` includes: Render + Vercel domains
- Database configuration supports PostgreSQL via `DATABASE_URL`
- WhiteNoise middleware for static files

✅ **Procfile**
```
web: gunicorn skillshare.wsgi
```

✅ **Runtime.txt**
```
python-3.13.7
```

---

## Troubleshooting

### Issue: CORS Errors
**Error**: `Access to XMLHttpRequest... has been blocked by CORS policy`

**Solution**: 
- Update `CORS_ALLOWED_ORIGINS` in Django settings
- Get your Vercel URL from deployment complete message
- Add it to backend settings:
  ```python
  CORS_ALLOWED_ORIGINS = [..., 'https://your-vercel-url.vercel.app']
  ```
- Redeploy to Render (push changes to GitHub, Render auto-redeploys)

### Issue: API Endpoints Returning 404
**Check**:
1. Verify `REACT_APP_API_BASE` environment variable is correct
2. Test API directly: `curl https://skill-hub-il65.onrender.com/api/users/`
3. Check Django admin is accessible: `https://skill-hub-il65.onrender.com/admin/`

### Issue: Images/Static Files Not Loading
**Solution**:
- Render is configured with WhiteNoise for static files
- Django collects static files automatically on new deployment
- Clear browser cache (Ctrl+Shift+Delete) and refresh

---

## Next Steps

1. **Deploy Frontend**:
   - Follow Vercel steps above
   - Your URL will be shown after deployment

2. **Update Backend CORS** (if needed):
   - Once you have the Vercel URL
   - Update `CORS_ALLOWED_ORIGINS` in `backend/skillshare/settings.py`
   - Push to GitHub, Render will auto-redeploy

3. **Test Full Integration**:
   - Sign up on the Vercel frontend
   - Login and use features
   - Check network tab to see API calls

4. **Monitor**:
   - Vercel Dashboard: https://vercel.com/dashboard
   - Render Dashboard: https://dashboard.render.com
   - Monitor error logs in both platforms

---

## Important URLs

- **Frontend (after deployment)**: `https://your-domain.vercel.app`
- **Backend (API)**: `https://skill-hub-il65.onrender.com`
- **Backend Admin**: `https://skill-hub-il65.onrender.com/admin/`
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## Credentials for Testing

- **Admin Username**: `admin`
- **Admin Password**: `admin@123`
- **Admin URL**: `https://skill-hub-il65.onrender.com/admin/`

(Remember to change these in production!)
