# Supabase Authentication Setup Guide

## ✅ What Changed

Your login system now uses **Supabase Authentication** instead of hardcoded credentials. This means:

- ✅ Passwords are encrypted and stored securely in Supabase
- ✅ No credentials visible in frontend code
- ✅ Easy user management through Supabase dashboard
- ✅ Professional authentication system
- ✅ Can add/remove users without touching code

---

## 🔧 Setup Steps

### 1. Enable Email Authentication in Supabase

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Click on **Authentication** in the left sidebar
3. Go to **Providers** tab
4. Make sure **Email** provider is enabled (should be enabled by default)

### 2. Create Users in Supabase Dashboard

**Method 1: Through Dashboard (Recommended)**

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Click **"Add user"** button
3. Fill in:
   - **Email:** `admin@waterdashboard.com` (or any email)
   - **Password:** `Admin@1234` (or any strong password)
   - **Auto Confirm User:** ✅ Check this (important!)
4. Click **Create user**

**Method 2: Using SQL (For multiple users)**

Go to **SQL Editor** and run:

```sql
-- Create admin user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@waterdashboard.com',
  crypt('Admin@1234', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  FALSE,
  ''
);
```

### 3. Test Login

1. Open your dashboard: http://localhost:5000/login.html
2. Enter credentials:
   - **Email:** `admin@waterdashboard.com`
   - **Password:** `Admin@1234`
3. Click **Sign in**
4. Should redirect to main dashboard

---

## 👥 Managing Users

### Add New User

**Option A: Dashboard UI**
1. Authentication → Users → Add user
2. Enter email and password
3. Check "Auto Confirm User"
4. Click Create

**Option B: Invite by Email** (Requires email setup)
1. Authentication → Users → Invite user
2. Enter email
3. User receives invitation email with setup link

### Remove User

1. Authentication → Users
2. Find user in list
3. Click three dots (⋮) → Delete user

### Reset Password

1. Authentication → Users
2. Find user → Click three dots (⋮)
3. Select "Reset password"
4. Send reset link to user's email

---

## 🔒 Security Best Practices

### Row Level Security (RLS) Policies

Add these policies to protect your data:

```sql
-- Enable RLS on all tables
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Authenticated users can read locations"
ON locations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read sensors"
ON sensors FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read sensor_readings"
ON sensor_readings FOR SELECT
TO authenticated
USING (true);

-- Allow service role to insert data (for ESP32)
CREATE POLICY "Service role can insert sensor_readings"
ON sensor_readings FOR INSERT
TO service_role
WITH CHECK (true);
```

### Email Provider Settings (Optional)

For production, configure custom SMTP:

1. Authentication → Settings → Email
2. Configure SMTP settings
3. Customize email templates

---

## 🧪 Testing

### Test User Accounts

Create these test accounts for development:

| Email | Password | Role |
|-------|----------|------|
| `admin@waterdashboard.com` | `Admin@1234` | Admin |
| `user@waterdashboard.com` | `User@1234` | Viewer |
| `operator@waterdashboard.com` | `Operator@1234` | Operator |

### Test Scenarios

✅ **Valid login** - Should redirect to dashboard  
✅ **Invalid password** - Should show error  
✅ **Invalid email** - Should show error  
✅ **Already logged in** - Should skip login and go to dashboard  
✅ **Logout** - Should return to login page  

---

## 🐛 Troubleshooting

### Error: "Invalid email or password"

**Solution:** Make sure:
- User exists in Supabase Auth
- Email is confirmed (Auto Confirm checked)
- Password is correct
- Email provider is enabled

### Error: "Supabase credentials not found"

**Solution:** Check `env-config.js` file:
```javascript
window.ENV = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key'
};
```

### User can't login after creation

**Solution:**
- Check if email is confirmed: Authentication → Users → User row
- If not confirmed, click "Confirm email"

### Page redirects to login immediately after login

**Solution:**
- Check browser console for errors
- Make sure `localStorage.setItem("isAuthenticated", "true")` is executed
- Clear browser cache and cookies

---

## 📝 Next Steps (Optional)

### 1. Add Role-Based Access Control (RBAC)

```sql
-- Add roles to users
UPDATE auth.users 
SET raw_user_meta_data = '{"role": "admin"}'::jsonb
WHERE email = 'admin@waterdashboard.com';
```

### 2. Add Email Confirmation Flow

Configure email templates in:
Authentication → Email Templates

### 3. Add Password Reset Flow

Add "Forgot Password" link to login page

### 4. Session Management

Configure session timeout:
Authentication → Settings → Session

---

## 🎉 Done!

Your water monitoring dashboard now has **enterprise-grade authentication**!

Users are managed securely in Supabase, and you can add/remove users anytime without changing code.
