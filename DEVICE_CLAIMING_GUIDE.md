# 🔐 Device Claiming System - Setup Guide

## Overview
Users can now claim ESP32 devices using Device ID + Password. Once claimed, they only see data from their devices.

---

## 📋 Setup Steps

### **Step 1: Run SQL in Supabase**

1. Open Supabase Dashboard → SQL Editor
2. Copy entire content from `sql/setup_device_claiming.sql`
3. Click **Run**
4. Verify success message appears

This creates:
- ✅ `devices` table with RLS
- ✅ Updated `sensor_readings` table with `device_id` column
- ✅ RLS policies (users see only their device data)
- ✅ `claim_device()` RPC function
- ✅ `get_user_devices()` RPC function
- ✅ `admin_get_user_devices()` RPC function
- ✅ `auto_register_device()` - Devices auto-register on first data send
- ✅ `auto_create_location_from_sensor()` - Locations auto-create from sensor data
- ✅ One sample device (ESP32-SALEM-001) for testing

---

### **Step 2: Configure ESP32 Devices**

Each ESP32 receiver needs unique credentials. Edit `ESP32_LoRa_Receiver.ino`:

```cpp
// Device Configuration
const char* deviceId = "ESP32-SALEM-001";          // Unique ID
const char* devicePassword = "salem123";           // Password for claiming
const char* deviceLocation = "salem_district";     // Primary location
```

**Important Notes:**
- ✅ **One ESP32 receiver = One device ID**
- ✅ **Receives LoRa data from MULTIPLE locations** (e.g., 5 villages)
- ✅ **All data tagged with same device_id**
- ✅ **Locations auto-create** when first data arrives
- ✅ **User claims ONE device** → sees data from ALL locations it monitors

**Sample Device Setup:**
- **Salem Receiver**: ID=`ESP32-SALEM-001`, Pass=`salem123`
  - Receives from: Nallampatti, Poolampatti, Vazhapadi, etc.
  
- **Coimbatore Receiver**: ID=`ESP32-CBE-001`, Pass=`ukkadam123`
  - Receives from: Ukkadam, Singanallur, Vedapatti, etc.

Upload code to each ESP32. **No database pre-configuration needed!**

---

### **Step 3: Test Device Claiming**

1. **Login** to dashboard: http://localhost:3000
2. Click **"Claim Device"** button (top right)
3. Enter credentials:
   - Device ID: `ESP32-SALEM-001`
   - Password: `salem123`
4. Click **Claim Device**
5. ✅ Success! Device appears in "Your Claimed Devices"

---

## 🎯 How It Works

### **Dynamic Data Flow:**

```
ESP32 LoRa Sender (Village 1: Nallampatti)
  ↓ Sends: "LOC:nallampatti,PH:7.2,TURB:15.3,TEMP:25.5,TDS:120"
  ↓ (433MHz LoRa)
  ↓
ESP32 Receiver (device_id: ESP32-SALEM-001)
  ↓ Receives LoRa → Parses data
  ↓ Adds device_id to each reading
  ↓ Sends to Supabase
  ↓
Supabase Backend:
  ✅ Auto-creates location "nallampatti" (if doesn't exist)
  ✅ Auto-registers device "ESP32-SALEM-001" (if doesn't exist)
  ✅ Inserts sensor reading with device_id
  ↓
Dashboard (User who claimed ESP32-SALEM-001):
  ✅ Sees Nallampatti marker on map
  ✅ Views real-time sensor data
```

**Then Village 2 sends data:**
```
ESP32 LoRa Sender (Village 2: Poolampatti)
  ↓ Sends: "LOC:poolampatti,PH:6.8,TURB:22.1,TEMP:26.0,TDS:145"
  ↓ (Same LoRa frequency)
  ↓
Same ESP32 Receiver (ESP32-SALEM-001)
  ↓ Receives → Parses → Sends with device_id
  ↓
Supabase:
  ✅ Auto-creates location "poolampatti"
  ✅ Links to same device
  ↓
Dashboard:
  ✅ Now shows BOTH Nallampatti AND Poolampatti
  ✅ All data from ONE claimed device
```

### **User Perspective:**

1. **Power on ESP32** → Starts receiving LoRa data
2. **First data send** → Device auto-registers in Supabase
3. **User claims device** → Enter `ESP32-SALEM-001` + password
4. **Dashboard updates** → See ALL locations monitored by that device
5. **Real-time** → New villages appear automatically as ESP32 receives their data

### **Admin Capabilities:**

- Admins can select any user from dropdown
- View that user's complete dashboard
- See which devices they've claimed
- See ALL locations monitored by those devices
- NOT viewing all users at once (isolated view)

---

## 🔄 Dynamic Features

### **Auto-Registration:**

**Devices:**
- ESP32 first sends data → Device auto-created in `devices` table
- Auto-generated random secret (user gets password separately)
- Can be claimed immediately after first data send

**Locations:**
- LoRa packet has `LOC:village_name`
- If location doesn't exist → Auto-created with placeholder coordinates (0,0)
- Admin updates coordinates later via Supabase dashboard
- Shows on map immediately (even with placeholder coords)

**Sensors:**
- Sensor readings stored as: `location_sensortype` (e.g., `nallampatti_ph`)
- No pre-configuration needed
- Works with ANY location name
- Supports: pH, turbidity, temperature, TDS, and any custom sensors

### **LoRa Packet Format (from Sender):**

Your ESP32 LoRa **Sender** should send packets in this format:

```
LOC:village_name,PH:7.2,TURB:15.3,TEMP:25.5,TDS:120
```

**Examples:**
```
LOC:nallampatti,PH:7.5,TURB:10.2,TEMP:26.0,TDS:110
LOC:poolampatti,PH:6.8,TURB:22.5,TEMP:25.5,TDS:145
LOC:vazhapadi,PH:7.1,TURB:18.7,TEMP:24.8,TDS:132
LOC:salem,PH:7.3,TURB:12.1,TEMP:26.2,TDS:125
```

**Rules:**
- ✅ Location name: lowercase, no spaces (use underscores: `red_hills`)
- ✅ Sensor values: Can be any float/integer
- ✅ pH range: 0.1 to 14.0 (validated by frontend)
- ✅ Add custom sensors: `OXYGEN:8.5,CONDUCTIVITY:450`
- ✅ Order doesn't matter after location
- ✅ Missing sensors are OK (e.g., only send PH and TEMP)

---

## 🔒 Security (Row Level Security)

**Devices Table:**
- Users see devices they claimed OR unclaimed devices
- Users can claim unclaimed devices
- Cannot steal devices from other users

**Sensor Readings Table:**
- Users ONLY see readings from their claimed devices
- ESP32 can insert readings (service role key)
- Complete data isolation per user

---

## 🧪 Testing Multi-User Setup

### **Test Scenario 1: Single User with Multiple Locations**

1. **Setup ESP32:**
   - Device ID: `ESP32-SALEM-001`
   - Password: `salem123`
   - Upload code and power on

2. **Send test data via LoRa Sender:**
   ```cpp
   // From Village 1
   LoRa.print("LOC:nallampatti,PH:7.2,TURB:15.3,TEMP:25.5,TDS:120");
   
   // From Village 2 (30 seconds later)
   LoRa.print("LOC:poolampatti,PH:6.8,TURB:22.1,TEMP:26.0,TDS:145");
   
   // From Village 3
   LoRa.print("LOC:vazhapadi,PH:7.1,TURB:18.7,TEMP:24.8,TDS:132");
   ```

3. **User Login & Claim:**
   - Email: `user1@test.com`
   - Claim device: `ESP32-SALEM-001` + `salem123`
   
4. **Result:**
   - ✅ Map shows 3 village markers
   - ✅ All data visible from ONE claimed device
   - ✅ Real-time updates as more villages send data

### **Test Scenario 2: Multiple Users with Different Regions**

1. **User 1 (Salem District):**
   - Claims: `ESP32-SALEM-001`
   - Sees: Nallampatti, Poolampatti, Vazhapadi, etc.

2. **User 2 (Coimbatore District):**
   - Claims: `ESP32-CBE-001`
   - Sees: Ukkadam, Singanallur, Vedapatti, etc.

3. **Isolation Test:**
   - User 1 cannot see User 2's locations ✅
   - User 2 cannot see User 1's locations ✅
   - Each sees only their claimed device data ✅

### **Create Admin User:**

Run in Supabase SQL Editor:
```sql
-- Make a user admin (replace with actual user email)
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@test.com';
```

**Admin can:**
- Select any user from dropdown
- View that user's complete dashboard
- See their claimed devices
- See all locations monitored by their devices

---

## 📱 Frontend Features

### **New UI Elements:**

1. **"Claim Device" Button** (Header)
   - Opens claim modal
   - Shows claimed devices list

2. **Claim Device Modal:**
   - Device ID input
   - Password input
   - List of claimed devices
   - Success/error messages

3. **Data Filtering:**
   - Automatic filtering by claimed devices
   - Real-time updates when claiming new device

### **Admin Features:**

- User selector dropdown (existing from user_overlays.js)
- View selected user's complete dashboard
- See their claimed devices

---

## 🔧 Troubleshooting

### **"No data showing after claiming device"**

✅ **Check ESP32 Serial Monitor:**
```
✅ System Ready - Listening for packets...
📩 LoRa Packet Received
Data: LOC:nallampatti,PH:7.2,TURB:15.3,TEMP:25.5,TDS:120
📍 Location: nallampatti
🔧 Device ID: ESP32-SALEM-001
✓ pH: 7.2
✓ Turbidity: 15.3 NTU
✓ Temperature: 25.5 °C
✓ TDS: 120.0 ppm
✅ 4 sensors uploaded successfully
```

✅ **Check Supabase:**
```sql
-- Verify device exists and is claimed
SELECT device_id, device_name, user_id, claimed_at 
FROM devices 
WHERE device_id = 'ESP32-SALEM-001';

-- Check if readings have device_id
SELECT sensor_id, value, device_id, timestamp 
FROM sensor_readings 
WHERE device_id = 'ESP32-SALEM-001' 
ORDER BY timestamp DESC 
LIMIT 10;

-- Verify location was auto-created
SELECT location_id, name, latitude, longitude 
FROM locations 
WHERE location_id = 'nallampatti';
```

### **"Locations showing at (0, 0) coordinates"**

This is normal! Locations auto-create with placeholder coordinates.

**Fix:**
```sql
-- Update location coordinates (admin task)
UPDATE locations 
SET latitude = 11.6643, longitude = 78.1460
WHERE location_id = 'nallampatti';

UPDATE locations 
SET latitude = 11.6234, longitude = 78.1095
WHERE location_id = 'poolampatti';
```

Or update via Supabase Table Editor → `locations` table.

### **"Device already claimed by another user"**

Device can only be claimed by ONE user at a time.

**Admin can unclaim:**
```sql
-- Unclaim device (admin only)
UPDATE devices 
SET user_id = NULL, claimed_at = NULL 
WHERE device_id = 'ESP32-SALEM-001';
```

Then user can claim it again.

### **"LoRa receiver not getting packets"**

✅ Check:
- Both ESP32s have same LoRa frequency (433MHz)
- Same spreading factor (SF12)
- Same bandwidth (62.5 kHz)
- Antennas connected properly
- Power supply is stable (3.3V)
- Distance < 2km (indoor) or < 10km (outdoor)

---

## 📊 Database Schema

### **devices table:**
```
id            uuid (PK)
device_id     text (UNIQUE) - "ESP32-SALEM-001"
device_name   text - "Salem District Device 1"
secret        text - Password for claiming
user_id       uuid (FK) - Who claimed it
location_id   text - Primary location
claimed_at    timestamp
metadata      jsonb
```

### **sensor_readings table (updated):**
```
id            uuid (PK)
sensor_id     text - "salem_ph"
value         numeric - 7.2
rssi          int - Signal strength
device_id     text - "ESP32-SALEM-001" ← NEW
timestamp     timestamp
```

---

## ✅ Success Checklist

- [ ] SQL script run successfully in Supabase
- [ ] ESP32 receiver code updated with device_id
- [ ] ESP32 uploading data successfully (check serial monitor)
- [ ] LoRa sender transmitting packets (check signal)
- [ ] User can claim device via UI
- [ ] Locations auto-create from LoRa data
- [ ] Data appears on map after claiming
- [ ] Multiple locations show from one device
- [ ] Different users see different data (RLS working)
- [ ] Admin can view user dashboards

---

## 📦 What You Built

**Dynamic Multi-User IoT System:**

✅ **Zero Configuration Required**
- No manual location setup
- No pre-defined devices
- Everything auto-creates from ESP32 data

✅ **Scalable Architecture**
- One ESP32 receiver → Unlimited villages/sensors
- One user → Multiple devices
- Infinite locations supported

✅ **Complete Data Isolation**
- Users see ONLY their claimed device data
- RLS enforced at database level
- Admin can impersonate users

✅ **Real-Time Updates**
- Sensor data streams live
- New locations appear automatically
- Dashboard refreshes on device claim

---

## 🚀 Production Deployment

### **ESP32 Fleet Management:**

1. **Generate device passwords:**
```sql
-- Create device with auto-generated secret
INSERT INTO devices (device_id, device_name, secret, location_id)
VALUES (
  'ESP32-REGION-001',
  'Region Name Receiver',
  md5(random()::text),
  'region_id'
);

-- Retrieve password for user
SELECT device_id, secret FROM devices WHERE device_id = 'ESP32-REGION-001';
```

2. **Give password to user** → They claim device → Done!

### **Location Coordinates Update:**

After locations auto-create at (0,0), admin updates coordinates:

```sql
-- Batch update locations
UPDATE locations SET latitude = 11.6643, longitude = 78.1460 WHERE location_id = 'nallampatti';
UPDATE locations SET latitude = 11.6234, longitude = 78.1095 WHERE location_id = 'poolampatti';
-- ... etc
```

Or use Supabase Table Editor for visual updates.

---

## 🎯 Real-World Example

**Salem Water Monitoring Project:**

**Hardware:**
- 1× ESP32 LoRa Receiver (placed in Salem city)
- 5× ESP32 LoRa Senders (distributed across villages)
- Sensors: pH, Turbidity, Temperature, TDS

**Setup:**
1. Configure receiver: `ESP32-SALEM-001` + `salem123`
2. Place senders in: Nallampatti, Poolampatti, Vazhapadi, Omalur, Edappadi
3. Power on → Data starts flowing automatically

**User Experience:**
1. User signs up: `salem.water@gov.in`
2. Claims device: `ESP32-SALEM-001` + `salem123`
3. Sees all 5 villages on map instantly
4. Real-time monitoring begins

**Result:**
- ✅ Complete district monitoring from ONE device claim
- ✅ No technical knowledge required
- ✅ Scalable to 50+ villages with same setup

---

**Your dynamic multi-user water monitoring system is ready! 🎉**

**Key Achievement:** Users don't need to know about databases, tables, or configuration. They just claim a device and see their data. That's the power of automation!
