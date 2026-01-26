# 🔐 PASSWORD-BASED DEVICE CLAIMING SYSTEM - COMPLETE GUIDE

## 📋 Overview

**New System**: Users claim devices using a secret password (no admin assignment needed)

### How It Works

```
1. ESP32 boots up with DEVICE_SECRET hardcoded
   ↓
2. ESP32 sends data → Auto-registers in device_registry table
   ↓
3. User receives DEVICE_SECRET (on paper/QR code/email)
   ↓
4. User enters SECRET in claim-device.html → Claims device
   ↓
5. User can now see device data in dashboard
```

---

## 🚀 Quick Deployment (5 Steps)

### Step 1: Deploy Database Schema (2 minutes)
```sql
-- In Supabase SQL Editor, run:
-- File: SETUP_PASSWORD_CLAIMING_SYSTEM.sql
```

This creates:
- `device_registry` table (stores all devices + claim status)
- Updated `sensor_readings` table (uses device_secret)
- RLS policies (automatic filtering by claimed devices)
- Functions: `claim_device()`, `unclaim_device()`, `register_device()`

### Step 2: Upload ESP32 Code (5 minutes per device)

1. Open **ESP32_PasswordClaiming.ino**
2. Change these lines:
   ```cpp
   const char* DEVICE_SECRET = "SALEM2024ABC123";  // ⚠️ UNIQUE for each device!
   const char* ssid = "Your_WiFi";
   const char* password = "Your_Password";
   float currentLatitude = 11.4102;   // Your device location
   float currentLongitude = 77.7197;
   ```

3. Upload to ESP32
4. Write down the DEVICE_SECRET (user will need it to claim)

### Step 3: Test Device Registration

1. Power on ESP32
2. Watch Serial Monitor (115200 baud)
3. Should see:
   ```
   ✅ Device registered successfully!
   📱 Give this secret to the user:
   ┌────────────────────────────────────┐
   │  SECRET: SALEM2024ABC123           │
   └────────────────────────────────────┘
   ```

4. Verify in Supabase:
   ```sql
   SELECT * FROM device_registry;
   -- Should show your device with is_claimed = FALSE
   ```

### Step 4: Claim Device (User Side)

1. User logs into dashboard
2. Goes to **claim-device.html**
3. Enters DEVICE_SECRET: `SALEM2024ABC123`
4. Clicks "Claim Device"
5. Device is now theirs!

### Step 5: Verify Everything Works

1. Check dashboard - should show device data
2. ESP32 sends new reading - should appear live
3. Other users shouldn't see this device

---

## 📁 Files Created/Updated

### Database Files
- **SETUP_PASSWORD_CLAIMING_SYSTEM.sql** - Complete database setup

### ESP32 Files
- **ESP32_PasswordClaiming.ino** - New ESP32 code with DEVICE_SECRET

### Frontend Files (Updated)
- **frontend/data.js** - Updated to use device_secret instead of device_id
- **frontend/claim-device.html** - New claiming interface

### Documentation
- **PASSWORD_CLAIMING_GUIDE.md** - This file

---

## 🔧 Database Schema

### Table: device_registry
```sql
device_secret       TEXT UNIQUE    -- Password to claim device
device_mac          TEXT UNIQUE    -- MAC address (auto-detected)
device_name         TEXT           -- Friendly name
is_claimed          BOOLEAN        -- Has anyone claimed it?
claimed_by          UUID           -- Who owns it
claimed_at          TIMESTAMPTZ    -- When was it claimed
first_seen          TIMESTAMPTZ    -- First transmission
last_seen           TIMESTAMPTZ    -- Last transmission
latitude/longitude  FLOAT          -- Last known position
```

### Table: sensor_readings
```sql
device_secret       TEXT           -- Links to device_registry
device_mac          TEXT           -- MAC address
latitude/longitude  FLOAT          -- GPS coordinates
water_level, ph, etc.              -- Sensor data
timestamp           TIMESTAMPTZ    -- When measured
```

---

## 🎯 Key Functions

### claim_device(secret, name)
Claims a device for current user
```sql
SELECT claim_device('SALEM2024ABC123', 'My Water Monitor');
```

**Returns**:
```json
{
  "success": true,
  "message": "Device claimed successfully!",
  "device_secret": "SALEM2024ABC123"
}
```

### unclaim_device(secret)
Releases device back to unclaimed pool
```sql
SELECT unclaim_device('SALEM2024ABC123');
```

### register_device(secret, mac, lat, lon, name)
Called automatically by ESP32 on first transmission
```sql
SELECT register_device(
  'SALEM2024ABC123',
  'AA:BB:CC:DD:EE:FF',
  11.4102,
  77.7197,
  'Salem Water Monitor'
);
```

---

## 🔒 Security Features

### 1. RLS (Row Level Security)
Users can only see data from devices they've claimed:
```sql
-- User queries sensor_readings
SELECT * FROM sensor_readings;

-- RLS automatically adds filter:
WHERE device_secret IN (
  SELECT device_secret FROM device_registry 
  WHERE claimed_by = current_user_id
)
```

### 2. Claim Protection
- Can't claim already-claimed devices (unless you're the owner)
- Can't see unclaimed devices in dashboard
- Only device owner can unclaim

### 3. Admin Override
Admins can:
- View all devices (claimed and unclaimed)
- Unclaim any device
- See all sensor data

---

## 📱 User Workflow

### For New Users

1. **Receive Device**
   - Get ESP32 device
   - Receive paper with DEVICE_SECRET: `SALEM2024ABC123`

2. **Power On Device**
   - ESP32 connects to WiFi
   - Auto-registers itself
   - Starts sending data

3. **Claim Device**
   - Log into dashboard
   - Go to claim-device.html
   - Enter secret code
   - Click "Claim Device"

4. **View Data**
   - Go to main dashboard (index.html)
   - See device on map
   - View live sensor readings

### For Multiple Devices

Repeat Step 3 for each device:
- Enter DEVICE_SECRET for device 2
- Enter DEVICE_SECRET for device 3
- All devices appear in same dashboard

---

## 🛠️ ESP32 Setup Guide

### Generating Unique Secrets

**Good Secrets** (hard to guess):
```cpp
SALEM_DISTRICT_2024_DEVICE_001_XYZ
WATER_MONITOR_ABC123DEF456
ESP32_SALEM_SECRET_789_UNIQUE
```

**Bad Secrets** (easy to guess):
```cpp
12345
password
device1
```

### Configuration Checklist

For each ESP32:
- [ ] Set unique DEVICE_SECRET
- [ ] Set WiFi credentials
- [ ] Set device location (lat/lon)
- [ ] Set device name
- [ ] Upload code
- [ ] Test registration
- [ ] Write down secret for user

### QR Code Option

Generate QR code with secret:
```
https://yourwebsite.com/claim?secret=SALEM2024ABC123
```

User scans QR → Auto-fills claiming form!

---

## 📊 Admin Tasks

### View All Devices
```sql
SELECT 
  device_secret,
  device_name,
  is_claimed,
  claimed_by,
  last_seen
FROM device_registry
ORDER BY last_seen DESC;
```

### Find Unclaimed Devices
```sql
SELECT * FROM device_registry 
WHERE is_claimed = FALSE
ORDER BY first_seen DESC;
```

### Find Inactive Devices (no data in 24h)
```sql
SELECT * FROM device_registry
WHERE last_seen < NOW() - INTERVAL '24 hours'
ORDER BY last_seen;
```

### Force Unclaim Device (Admin Only)
```sql
UPDATE device_registry
SET is_claimed = FALSE, 
    claimed_by = NULL, 
    claimed_at = NULL
WHERE device_secret = 'SALEM2024ABC123';
```

---

## 🧪 Testing Checklist

### Database Tests
- [ ] Run SETUP_PASSWORD_CLAIMING_SYSTEM.sql successfully
- [ ] Check tables exist: `SELECT * FROM device_registry;`
- [ ] Check RLS enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'device_registry'`
- [ ] Test claim function: `SELECT claim_device('TEST123', 'Test Device');`

### ESP32 Tests
- [ ] ESP32 connects to WiFi
- [ ] Serial monitor shows "Device registered successfully!"
- [ ] Device appears in device_registry table
- [ ] Sensor data appears in sensor_readings table
- [ ] device_secret matches in both tables

### Frontend Tests
- [ ] claim-device.html loads without errors
- [ ] Can claim unclaimed device
- [ ] Can't claim already-claimed device
- [ ] Claimed device appears in "My Devices" list
- [ ] Can view device data in main dashboard
- [ ] Can unclaim own device
- [ ] Realtime updates work

### Security Tests
- [ ] User A can't see User B's devices
- [ ] User A can't claim User B's device
- [ ] RLS prevents direct database queries
- [ ] Admin can see all devices

---

## 🔄 Migration from Old System

### If Migrating from device_assignments

```sql
-- Step 1: Create device_registry entries from existing assignments
INSERT INTO device_registry (
  device_secret,
  device_name,
  is_claimed,
  claimed_by,
  claimed_at
)
SELECT 
  device_id as device_secret,  -- Old device_id becomes the secret
  device_name,
  TRUE as is_claimed,
  user_id as claimed_by,
  assigned_at as claimed_at
FROM device_assignments;

-- Step 2: Update sensor_readings (add device_secret column if needed)
ALTER TABLE sensor_readings 
ADD COLUMN IF NOT EXISTS device_secret TEXT;

UPDATE sensor_readings sr
SET device_secret = sr.device_id
WHERE device_secret IS NULL;

-- Step 3: Drop old table (AFTER verifying new system works!)
-- DROP TABLE device_assignments CASCADE;
```

### Updating Existing ESP32 Devices

1. Add DEVICE_SECRET to code (use old device_id as secret)
2. Update code to send device_secret instead of device_id
3. Re-upload to all ESP32 devices

---

## 🐛 Troubleshooting

### "Device not found or has not transmitted data yet"
**Cause**: Device hasn't sent data / registered yet  
**Fix**: 
- Check ESP32 is powered on
- Check WiFi connection
- Check Serial Monitor for errors
- Verify Supabase credentials in ESP32 code

### "Device already claimed by another user"
**Cause**: Someone else claimed it first  
**Fix**:
- Contact admin to unclaim device
- Or use different device secret

### "No devices claimed yet"
**Cause**: User hasn't claimed any devices  
**Fix**:
- Go to claim-device.html
- Enter device secret
- Click "Claim Device"

### Dashboard shows no data
**Cause**: No claimed devices or no sensor data yet  
**Fix**:
- Claim a device first
- Wait for ESP32 to send data (every 15 seconds)
- Check browser console for errors

### Realtime not working
**Cause**: Subscription filter wrong or Realtime disabled  
**Fix**:
- Check Supabase project has Realtime enabled
- Check browser console for subscription errors
- Verify device_secret in readings matches claimed device

---

## 📈 Scalability

### Device Capacity
- ✅ 10 devices → Works perfect
- ✅ 100 devices → Works perfect
- ✅ 1,000 devices → Works perfect
- ✅ 10,000+ devices → Still works (same performance)

All use ONE table with proper indexes!

### User Capacity
- Each user can claim unlimited devices
- Each device can only be claimed by one user
- (Future: Allow shared devices with multiple owners)

---

## 🎨 Customization

### Changing Claim UI
Edit `frontend/claim-device.html`:
- Add device type selection
- Add location picker
- Add photo upload
- Custom styling

### Auto-Claim via QR Code
```html
<!-- Add to claim-device.html -->
<script>
// Auto-fill from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const secret = urlParams.get('secret');
if (secret) {
  document.getElementById('deviceSecret').value = secret;
}
</script>
```

### Device Transfer
Allow users to transfer device to another user:
```sql
CREATE FUNCTION transfer_device(
  p_device_secret TEXT,
  p_new_owner_email TEXT
) ...
```

---

## 📞 Support

### Documentation Files
- **Setup**: SETUP_PASSWORD_CLAIMING_SYSTEM.sql
- **ESP32**: ESP32_PasswordClaiming.ino
- **UI**: frontend/claim-device.html
- **Guide**: PASSWORD_CLAIMING_GUIDE.md (this file)

### Quick SQL Commands
```sql
-- View my claimed devices
SELECT * FROM my_devices;

-- Claim a device
SELECT claim_device('SECRET123', 'Device Name');

-- Unclaim a device
SELECT unclaim_device('SECRET123');

-- Check if device exists
SELECT * FROM device_registry WHERE device_secret = 'SECRET123';

-- See device's latest data
SELECT * FROM sensor_readings 
WHERE device_secret = 'SECRET123' 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## ✅ Success Checklist

After deployment, you should have:

- ✅ Database tables created (device_registry, sensor_readings)
- ✅ RLS policies active
- ✅ ESP32 sending data with DEVICE_SECRET
- ✅ Users can claim devices via claim-device.html
- ✅ Dashboard shows only claimed devices
- ✅ Realtime updates working
- ✅ Security verified (users can't see others' devices)

---

## 🎉 You're Ready!

Your water monitoring dashboard now has:
- **Self-service device claiming** (no admin needed)
- **Secure password-based system** (like WiFi password)
- **Auto-registration** (ESP32 registers on first transmission)
- **Simple user experience** (enter secret, done!)

**Deploy now** by following the Quick Deployment section above!
