# Authentication Bypass Guide

## Overview

Your Research Blog application now has **authentication bypass** enabled for development convenience. This allows you to access all features without needing to create an account or log in.

---

## 🔓 Current Status: BYPASS ENABLED

Authentication bypass is **currently active**. You can access any page directly:

- ✅ Dashboard, Feed, Papers, Projects - all accessible without login
- ✅ Automatic mock user created: "Development User"
- ✅ Full app functionality available for testing

---

## How It Works

When bypass is enabled, the app automatically:

1. **Creates a mock user** with the following details:
   - **Name**: Development User
   - **Email**: dev@localhost.com
   - **Role**: Researcher
   - **Institution**: Development Institute
   - **Status**: Verified

2. **Skips all authentication checks** in middleware
3. **Allows access** to all protected routes

---

## Toggle Authentication Bypass

### To DISABLE Bypass (require login):

Edit [`.env`](.env) and change:
```bash
BYPASS_AUTH="false"
NEXT_PUBLIC_BYPASS_AUTH="false"
```

Then restart the server:
```bash
# Press Ctrl+C to stop the server, then:
npm run dev:socket
```

### To ENABLE Bypass (current setting):

Edit [`.env`](.env) and change:
```bash
BYPASS_AUTH="true"
NEXT_PUBLIC_BYPASS_AUTH="true"
```

Then restart the server.

---

## When to Use Each Mode

### ✅ Use Bypass Mode (BYPASS_AUTH="true") When:
- Testing UI/UX without database
- Rapid prototyping and development
- Demonstrating features without setup
- Working on frontend components
- No database is available

### 🔐 Disable Bypass (BYPASS_AUTH="false") When:
- Testing authentication flows
- Testing user permissions
- Working on auth-related features
- Database is set up with test users
- Preparing for production
- Testing multi-user scenarios

---

## Checking Current Mode

Look for these console messages in the browser:

**Bypass Enabled:**
```
🔓 [DEV] Authentication bypass enabled - using mock user
```

**Bypass Disabled:**
You'll be redirected to `/auth/signin` when accessing protected routes.

---

## Mock User Details

When bypass is enabled, you're automatically logged in as:

```json
{
  "id": "dev-user-bypass",
  "email": "dev@localhost.com",
  "name": "Development User",
  "role": "researcher",
  "institution": "Development Institute",
  "department": "Computer Science",
  "bio": "This is a development user for testing without authentication",
  "researchInterests": ["AI", "Web Development", "Testing"],
  "verificationStatus": "verified"
}
```

---

## Security Note

⚠️ **IMPORTANT**: This bypass ONLY works in development mode.

The bypass is automatically disabled in production:
- `process.env.NODE_ENV === 'production'` - bypass won't work
- Even if `BYPASS_AUTH` is set to `true`, it's ignored in production

**Never deploy with bypass enabled!**

---

## Troubleshooting

### Bypass not working?

1. **Check `.env` file**:
   ```bash
   cat .env | grep BYPASS
   ```
   Should show:
   ```
   BYPASS_AUTH="true"
   NEXT_PUBLIC_BYPASS_AUTH="true"
   ```

2. **Restart the server**:
   - Changes to `.env` require server restart
   - Press `Ctrl+C` then run `npm run dev:socket`

3. **Clear browser cache**:
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Or clear localStorage in DevTools

4. **Check console logs**:
   - Open browser DevTools (F12)
   - Look for `🔓 [DEV] Authentication bypass enabled` message

### Still seeing login page?

- Make sure both `BYPASS_AUTH` and `NEXT_PUBLIC_BYPASS_AUTH` are set to `"true"`
- Check that you're in development mode (not production build)
- Verify server has been restarted after changing `.env`

---

## Next Steps

### For Development (Current Setup):
✅ You're all set! Visit [http://localhost:3200](http://localhost:3200) and explore the app.

### To Set Up Real Authentication:
1. Set up PostgreSQL database (see [`database-setup.md`](database-setup.md))
2. Run migrations: `npx prisma migrate dev`
3. Seed test users: `npx prisma db seed`
4. Disable bypass in `.env`
5. Restart server
6. Use test credentials (e.g., alice.johnson@mit.edu / password123)

---

## Quick Reference

| Action | Command |
|--------|---------|
| **Enable Bypass** | Set `BYPASS_AUTH="true"` in `.env` + restart |
| **Disable Bypass** | Set `BYPASS_AUTH="false"` in `.env` + restart |
| **Restart Server** | `Ctrl+C` then `npm run dev:socket` |
| **View Current User** | Check browser console for mock user message |
| **Access App** | [http://localhost:3200](http://localhost:3200) |

---

## Modified Files

The following files were modified to support authentication bypass:

1. **[`src/middleware.ts`](src/middleware.ts)** - Added bypass check before auth validation
2. **[`src/contexts/AuthContext.tsx`](src/contexts/AuthContext.tsx)** - Auto-creates mock user when bypass enabled
3. **[`.env`](.env)** - Added `BYPASS_AUTH` and `NEXT_PUBLIC_BYPASS_AUTH` flags

No other files were modified - the bypass is cleanly isolated and can be toggled on/off easily!
