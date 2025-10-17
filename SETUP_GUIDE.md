# Water Dashboard - Quick Setup Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Supabase Setup (2 minutes)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose organization and enter project details
   - Wait for project to be ready

2. **Get Your Credentials**
   - Go to Settings → API
   - Copy your Project URL and anon/public key

3. **Create Database Table**
   - Go to SQL Editor
   - Paste and run this SQL:

```sql
-- Create sensor_data table
CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    value DECIMAL(10, 4) NOT NULL,
    unit VARCHAR(20) DEFAULT 'ppm',
    status VARCHAR(20) DEFAULT 'active',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view sensor data" ON sensor_data
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert sensor data" ON sensor_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;
```

### Step 2: Configure Application (1 minute)

1. **Update Configuration**
   - Open `config.js`
   - Replace `YOUR_SUPABASE_URL` with your Project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon key

```javascript
this.supabase = {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key-here'
};
```

### Step 3: Test Locally (1 minute)

1. **Install Dependencies**
```bash
npm install
```

2. **Start Development Server**
```bash
npm run dev
```

3. **Open Browser**
   - Go to `http://localhost:3000`
   - You should see the login page

### Step 4: Create Test Account (1 minute)

1. **Sign Up**
   - Click "Sign up here" on login page
   - Enter email and password
   - Check email for verification (if required)

2. **Login**
   - Use your credentials to login
   - You should see the dashboard with sample data

## 🧪 Testing Features

### Authentication
- ✅ Sign up with new account
- ✅ Login with existing account  
- ✅ Logout functionality
- ✅ Protected routes (try accessing `/index.html` without login)

### Map Interface
- ✅ Map loads with sample sensors
- ✅ Toggle between street and satellite view
- ✅ Click markers to see popup
- ✅ Click "View Details" to go to location dashboard
- ✅ Use map controls (zoom, locate, refresh)

### Real-time Features
- ✅ Statistics update automatically
- ✅ Recent readings show in sidebar
- ✅ Connection status indicator

### Location Dashboard
- ✅ Click any marker → location dashboard opens
- ✅ Charts display historical data
- ✅ Export CSV functionality
- ✅ Real-time value updates

## 🔧 Adding Real ESP32 Data

### Quick Test with Sample Data

Add this to your browser console on the dashboard:

```javascript
// Simulate ESP32 sending data
window.dataManager.insertSensorReading('sensor_test', 85.2, 40.7128, -74.0060, 'Test Sensor');
```

### Connect Real ESP32

1. **Upload ESP32 Code**
   - See `ESP32_INTEGRATION.md` for complete code
   - Update WiFi credentials
   - Update Supabase URL and key
   - Flash to ESP32

2. **Verify Connection**
   - Check ESP32 serial monitor
   - Data should appear in dashboard automatically
   - New markers will show on map

## 🌐 Deployment Options

### Option 1: Netlify (Recommended)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir .
```

**Set Environment Variables in Netlify:**
- `SUPABASE_URL` = your project URL
- `SUPABASE_ANON_KEY` = your anon key

### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
```

### Option 3: Static Hosting

Upload all files to any static hosting service:
- GitHub Pages
- Firebase Hosting
- AWS S3 + CloudFront
- Any web server with HTTPS

## 🐛 Troubleshooting

### "Configuration error" message
- Check Supabase URL and key in `config.js`
- Ensure no typos or extra spaces
- Verify Supabase project is active

### Map not loading
- Check internet connection
- Open browser dev tools for errors
- Verify MapLibre GL JS CDN is accessible

### Authentication not working
- Check Supabase project settings
- Verify email confirmation settings
- Clear browser cache and cookies

### Real-time updates not working
- Ensure Supabase Realtime is enabled
- Check WebSocket connection in dev tools
- Verify database policies allow access

### ESP32 connection issues
- Check WiFi credentials
- Verify Supabase URL format (include https://)
- Monitor ESP32 serial output for errors

## 📞 Support

- **Issues**: Check browser console for errors
- **Database**: Verify table structure in Supabase
- **ESP32**: Check serial monitor output
- **Deployment**: Run `npm run deploy-check` for validation

## 🎯 Next Steps

1. **Customize Design**: Edit colors in `style.css`
2. **Add Sensors**: Deploy more ESP32 devices
3. **Set Alerts**: Add threshold monitoring
4. **Scale Up**: Add user management and multi-tenancy

---

**Your water monitoring dashboard is ready! 🌊**
