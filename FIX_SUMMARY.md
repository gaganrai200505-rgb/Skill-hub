# Fix Summary - API Communication & Server Sleep Issues

## Problems Fixed

### 1. ✅ Frontend-Backend Communication (Failed to Fetch Error)
**Root Cause:** Frontend components had hardcoded `http://127.0.0.1:8000` URLs instead of using environment variables. This broke production deployment on Vercel.

**Files Fixed:**
- `frontend/src/pages/Signup.js` - Added environment variable support
- `frontend/src/pages/Skills.js` - Fixed 3 hardcoded fetch calls
- `frontend/src/pages/StudentTimeslotView.js` - Fixed hardcoded API_BASE
- `frontend/src/pages/UserProfileView.js` - Fixed 4 hardcoded fetch calls

**Solution Implementation:**
All components now use: `const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";`

### 2. ✅ Server Sleep Issue on Render
**Root Cause:** Render's free tier spins down instances after 15 minutes of inactivity.

**Solution Implemented:**

#### Backend Changes:
1. **Added Keep-Alive Middleware** (`backend/skillshare/middleware.py`):
   - Pings the server every 10 minutes to prevent spin-down
   - Only activates in production (Render environment)
   - Runs in background daemon thread

2. **Added Health Check Endpoint** (`backend/api/views.py`):
   - New endpoint: `/api/health/`
   - Used by the keep-alive middleware for ping verification
   - Returns: `{"status": "ok", "message": "Server is alive"}`

3. **Updated Django Settings** (`backend/skillshare/settings.py`):
   - Added `KeepAliveMiddleware` to middleware stack
   - Middleware registers in `MIDDLEWARE` list

4. **Updated API URLs** (`backend/api/urls.py`):
   - Added health check route: `path('health/', views.health_check, name='health-check')`

---

## Environment Configuration

### Frontend Environment Files

#### `.env.development` (Local Development)
```
REACT_APP_API_BASE=http://127.0.0.1:8000
```

#### `.env.production` (Production/Vercel)
```
REACT_APP_API_BASE=https://skill-hub-il65.onrender.com
```

---

## How to Deploy

### Frontend (Vercel)
```bash
# Already configured with environment variable in .env.production
# Just push to GitHub and Vercel will auto-deploy with REACT_APP_API_BASE
```

### Backend (Render)
```bash
# On Render, add environment variable in Settings → Environment Variables:
# RENDER=true  (Render sets this automatically)
```

---

## How the Components Now Work

### Before (Broken)
```javascript
// Hardcoded - breaks in production
const response = await fetch("http://127.0.0.1:8000/api/users/register/");
```

### After (Fixed)
```javascript
// Uses environment variable with fallback
const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";
const response = await fetch(`${API_BASE}/api/users/register/`);
```

---

## Testing

### Local Testing
1. Start Django: `python manage.py runserver`
2. Start React: `cd frontend && npm start`
3. Both will use `http://127.0.0.1:8000` via `.env.development`

### Production Testing
1. Build frontend: `cd frontend && npm run build`
2. Check that React uses Render's backend URL via `REACT_APP_API_BASE`
3. Keep-alive middleware will automatically keep server alive

---

## Keep-Alive Behavior

- **Activation:** Only runs when `RENDER=true` (Render automatically sets this)
- **Frequency:** Pings every 10 minutes
- **Endpoint:** `/api/health/`
- **Thread:** Background daemon thread (non-blocking)
- **Timeout:** 5 seconds per request (fails silently if unreachable)

---

## What Changed

| File | Change | Purpose |
|------|--------|---------|
| `frontend/.env.development` | Created | Local development API URL |
| `frontend/src/pages/Signup.js` | Added API_BASE variable | Fix hardcoded localhost |
| `frontend/src/pages/Skills.js` | Added API_BASE + fixed 3 calls | Fix hardcoded localhost |
| `frontend/src/pages/StudentTimeslotView.js` | Changed API_BASE to env var | Fix hardcoded localhost |
| `frontend/src/pages/UserProfileView.js` | Added API_BASE + fixed 4 calls | Fix hardcoded localhost |
| `backend/skillshare/middleware.py` | Created | Keep-alive functionality |
| `backend/skillshare/settings.py` | Added middleware to list | Enable keep-alive |
| `backend/api/views.py` | Added health_check() | Endpoint for keep-alive pings |
| `backend/api/urls.py` | Added health route | Route for health endpoint |

---

## Next Steps

1. **Commit & Push:** `git add . && git commit -m "Fix API communication and server sleep issues"`
2. **Redeploy Frontend:** Push to GitHub and Vercel will auto-deploy
3. **Redeploy Backend:** Push to GitHub and Render will auto-deploy
4. **Test:** Try signup on the live Vercel URL
5. **Monitor:** Backend should now stay alive with keep-alive pings
