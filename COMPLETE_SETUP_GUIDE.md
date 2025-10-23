# 🚰 Water Quality Monitoring System - Complete Setup Guide

**Real Hardware Setup: ESP32 LoRa Sender → LoRa Receiver → Supabase → Dashboard**

---

## 📋 System Overview

```
ESP32 Sender          ESP32 Receiver           Supabase              Dashboard
(LoRa RA-02)         (LoRa RA-02 + WiFi)      (PostgreSQL)         (Web Browser)
     │                      │                      │                     │
     │  LoRa Packet        │                      │                     │
     │  433MHz             │   HTTP POST          │  Real-time          │
     │ ──────────────────> │ ──────────────────>  │  WebSocket          │
     │                     │                      │ ──────────────────> │
     │                     │                      │                     │
   Sensor Data         Parse & Forward        Store & Trigger      Display Charts
  (4 locations)                                                     
```

### What This System Does:
1. **Sender ESP32**: Cycles through 4 locations, transmits sensor data via LoRa (433MHz)
2. **Receiver ESP32**: Receives LoRa packets, parses data, sends to Supabase via WiFi
3. **Supabase**: Stores data in PostgreSQL, triggers real-time updates
4. **Dashboard**: Displays all 4 locations with live charts (auto-updates without refresh)

### Hardware Required:
- **2x ESP32 Dev Boards** (one sender, one receiver)
- **2x LoRa RA-02 Modules** (433MHz)
- **USB cables** for programming
- **WiFi network** (for receiver only)
- **Supabase account** (free tier)

---

## 🎯 Step-by-Step Setup

### Phase 1: Supabase Backend Setup (10 minutes)

#### 1.1 Verify Your Database Tables

You already have these tables created (as shown in your screenshot):
- ✅ `locations`
- ✅ `sensors` 
- ✅ `sensor_readings`
- ✅ `alerts`

**If you need to recreate or fix them**, run the migration script:

1. Open Supabase SQL Editor
2. Copy contents of `fix_database_schema.sql` from your project
3. Click RUN

This ensures:
- `sensor_readings.sensor_id` is **VARCHAR(50)** (not UUID)
- `insert_reading()` function exists
- Triggers are properly configured

#### 1.2 Get API Credentials

**IMPORTANT:** You need these for the receiver ESP32!

```
✓ Go to: Supabase Dashboard → Settings → API
✓ Copy "Project URL" (e.g., https://uvqcctheqvuilwfbpqcd.supabase.co)
✓ Copy "anon public" key (long string starting with eyJ...)
✓ Save both - you'll paste them in ESP32 receiver code!
```

#### 1.3 Verify Database Function Exists

Run this query in Supabase SQL Editor to check:

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'insert_reading';
```

**Expected result:** Should show `insert_reading`

**If empty**, run this SQL:

```sql
CREATE OR REPLACE FUNCTION insert_reading(
  p_sensor_id VARCHAR,
  p_value DECIMAL,
  p_rssi INTEGER
)
RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM sensors WHERE sensor_id = p_sensor_id) THEN
    INSERT INTO sensor_readings (sensor_id, value, rssi)
    VALUES (p_sensor_id, p_value, p_rssi);
  ELSE
    RAISE NOTICE 'Sensor not found: %', p_sensor_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

#### 1.4 Enable Real-time Subscriptions

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE sensors;
```

---

### Phase 2: Frontend Configuration (5 minutes)

#### 2.1 Update Environment Config

Open `frontend/env-config.js` and update with your Supabase credentials:

```javascript
window.ENV_CONFIG = {
  SUPABASE_URL: 'https://uvqcctheqvuilwfbpqcd.supabase.co',  // Your project URL
  SUPABASE_ANON_KEY: 'your-anon-key-here'  // Your anon public key
};
```

#### 2.2 Start Frontend Server

```powershell
cd frontend
node server.js
```

**Expected output:**
```
Server running on http://localhost:5000
```

#### 2.3 Test Dashboard

Open browser: `http://localhost:5000`

✓ Should see map with 4 village markers  
✓ Click markers to open location dashboards  
✓ Charts will be empty until ESP32 sends data

---

### Phase 3: ESP32 Hardware Setup (30 minutes)

#### 3.1 Hardware Wiring

**You need TWO ESP32 boards with LoRa RA-02 modules**

**Wiring (SAME for both sender and receiver):**
```
ESP32 Pin      LoRa RA-02 Pin
---------      --------------
3.3V      →    VCC (⚠️ NOT 5V!)
GND       →    GND
GPIO 5    →    NSS (CS)
GPIO 14   →    RST
GPIO 2    →    DIO0
GPIO 18   →    SCK
GPIO 19   →    MISO
GPIO 23   →    MOSI
```

**⚠️ CRITICAL:** LoRa RA-02 is 3.3V only! Using 5V will damage it!

#### 3.2 Install Arduino Libraries

In Arduino IDE:
```
Tools > Manage Libraries > Install:
  - LoRa by Sandeep Mistry (version 0.8.0 or later)
  - ArduinoJson by Benoit Blanchon (version 6.x)
```

---

#### 3.3 Configure and Upload SENDER Code

**File: `ESP32_LoRa_Sender.ino`**

1. **Open the file** in Arduino IDE
2. **NO changes needed** - it's ready to use!
3. **Select Board**: Tools > Board > ESP32 Arduino > ESP32 Dev Module
4. **Select Port**: Tools > Port > (your ESP32 port)
5. **Click Upload**
6. **Open Serial Monitor** (115200 baud)

**Expected Serial Output:**
```
╔════════════════════════════════════════╗
║   ESP32 LoRa Sender - Water Monitor   ║
╚════════════════════════════════════════╝

✅ LoRa Initialized Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frequency:       433 MHz
Spreading Factor: 12 (Long Range)
Bandwidth:       62.5 kHz
TX Power:        20 dBm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Cycling through 4 locations every 20s

┌─────────────────────────────────────────
│ 📍 Location: ukkadam
├─────────────────────────────────────────
│ pH:          100.1
│ Turbidity:   100.1 NTU
│ Temperature: 100.1 °C
│ TDS:         100.1 ppm
└─────────────────────────────────────────
📤 Transmitting: LOC:ukkadam,PH:100.1,TURB:100.1,TEMP:100.1,TDS:100.1
✅ Packet sent!
```

The sender will:
- ✅ Cycle through: ukkadam → singanallur → redhills → porur
- ✅ Send all 4 sensors: pH, Turbidity, Temperature, TDS
- ✅ Sequential values: 100.1, 101.1, 102.1... (resets at 200.1)
- ✅ Transmit every 20 seconds

---

#### 3.4 Configure and Upload RECEIVER Code

**File: `ESP32_LoRa_Receiver.ino`**

1. **Open the file** in Arduino IDE

2. **UPDATE WiFi Credentials** (Lines 26-27):
```cpp
const char* ssid = "YOUR_WIFI_NAME";      // Change this!
const char* password = "YOUR_WIFI_PASSWORD";  // Change this!
```

3. **UPDATE Supabase Credentials** (Lines 32-33):
```cpp
const char* supabaseUrl = "https://uvqcctheqvuilwfbpqcd.supabase.co";  // Your URL
const char* supabaseKey = "your-anon-key-here";  // Your anon key from Supabase
```

4. **Select Board**: ESP32 Dev Module
5. **Select Port**: (different port from sender)
6. **Click Upload**
7. **Open Serial Monitor** (115200 baud)

**Expected Serial Output:**
```
╔════════════════════════════════════════╗
║  ESP32 LoRa Receiver - Water Monitor  ║
╚════════════════════════════════════════╝

🌐 Connecting to WiFi: YOUR_WIFI_NAME
...
✅ WiFi Connected!
IP Address: 192.168.1.XX
Signal Strength: -45 dBm

📡 Initializing LoRa... SUCCESS!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frequency:       433 MHz
Spreading Factor: 12 (Long Range)
Bandwidth:       62.5 kHz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ System Ready - Listening for packets...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📩 LoRa Packet Received
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Data: LOC:ukkadam,PH:100.1,TURB:100.1,TEMP:100.1,TDS:100.1
RSSI: -45 dBm
SNR:  9.5 dB

📍 Location: ukkadam
Parsing sensors...
  ✓ pH: 100.1
  ✓ Turbidity: 100.1 NTU
  ✓ Temperature: 100.1 °C
  ✓ TDS: 100.1 ppm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 4 sensors uploaded successfully
```

---

### Phase 4: Verify Everything Works (5 minutes)

#### 4.1 Check Supabase Data

1. Open Supabase Dashboard → Table Editor → `sensor_readings`
2. Click "Refresh" every 20 seconds
3. You should see new rows appearing with:
   - `sensor_id`: ukkadam_ph, ukkadam_turbidity, etc.
   - `value`: 100.1, 101.1, 102.1... (incrementing)
   - `timestamp`: Recent timestamps

#### 4.2 Check Dashboard

1. Browser: http://localhost:5000
2. Click on **Ukkadam** marker (first location)
3. Charts should show data appearing in real-time
4. After 80 seconds (4 locations × 20s), all 4 locations will have data

#### 4.3 Expected Behavior

**Cycle 1 (0-80 seconds):**
- 0s: Ukkadam gets data (100.1)
- 20s: Singanallur gets data (101.1)
- 40s: Red Hills gets data (102.1)
- 60s: Porur gets data (103.1)

**Cycle 2 (80-160 seconds):**
- 80s: Ukkadam gets new data (104.1)
- 100s: Singanallur gets new data (105.1)
- etc.

✅ **Success!** Dashboard updates automatically without page refresh!

---

## 🔧 Troubleshooting

### Sender Issues

**❌ LoRa initialization failed**
- Check wiring (VCC to 3.3V, NOT 5V!)
- Verify pin connections match code
- Try different USB cable/port

**❌ No output in Serial Monitor**
- Select correct port
- Set baud rate to 115200
- Press ESP32 reset button

### Receiver Issues

**❌ WiFi won't connect**
- Check SSID/password (case-sensitive!)
- Use 2.4GHz WiFi (not 5GHz)
- Move closer to router

**❌ HTTP 400/500 errors**
- Verify Supabase URL is correct
- Check anon key (starts with "eyJ...")
- Run `fix_database_schema.sql` in Supabase
- Confirm `insert_reading` function exists

**❌ No LoRa packets received**
- Check both ESP32s are powered on
- Verify same frequency (433MHz)
- Move devices closer (within 5 meters for testing)
- Check antennas are connected

### Dashboard Issues

**❌ No data showing**
- Check `frontend/env-config.js` has correct credentials
- Open browser console (F12) for errors
- Verify Supabase has data in `sensor_readings` table
- Check server is running: `node server.js`

**❌ Real-time not working**
- Run in Supabase SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;`
- Refresh browser with Ctrl+Shift+R
- Check WebSocket in Network tab (should be green)

---

## � What You Should See

### Sender Serial Monitor:
```
📤 Transmitting: LOC:ukkadam,PH:100.1,TURB:100.1,TEMP:100.1,TDS:100.1
✅ Packet sent!

(wait 20 seconds)

📤 Transmitting: LOC:singanallur,PH:101.1,TURB:101.1,TEMP:101.1,TDS:101.1
✅ Packet sent!
```

### Receiver Serial Monitor:
```
📩 LoRa Packet Received
Data: LOC:ukkadam,PH:100.1,TURB:100.1,TEMP:100.1,TDS:100.1
RSSI: -45 dBm

✅ 4 sensors uploaded successfully
```

### Supabase Table Editor:
| sensor_id | value | rssi | timestamp |
|-----------|-------|------|-----------|
| ukkadam_ph | 100.1 | -45 | 2025-10-23 10:30:00 |
| ukkadam_turbidity | 100.1 | -45 | 2025-10-23 10:30:01 |
| singanallur_ph | 101.1 | -48 | 2025-10-23 10:30:20 |

### Dashboard:
- Map shows 4 markers
- Clicking Ukkadam shows charts with pH=100.1, Turbidity=100.1, etc.
- Charts update every 20 seconds automatically

---

## ✅ Complete Setup Checklist

**Supabase:**
- [ ] Account created
- [ ] Tables exist (locations, sensors, sensor_readings, alerts)
- [ ] `insert_reading` function created
- [ ] Real-time enabled on `sensor_readings`
- [ ] Copied Project URL and anon key

**Frontend:**
- [ ] `env-config.js` updated with Supabase credentials
- [ ] Server running: `node server.js` on port 5000
- [ ] Browser shows map with 4 markers

**ESP32 Sender:**
- [ ] LoRa RA-02 wired correctly
- [ ] `ESP32_LoRa_Sender.ino` uploaded
- [ ] Serial Monitor shows transmissions every 20s
- [ ] Cycles through all 4 locations

**ESP32 Receiver:**
- [ ] LoRa RA-02 wired correctly  
- [ ] WiFi credentials updated in code
- [ ] Supabase credentials updated in code
- [ ] `ESP32_LoRa_Receiver.ino` uploaded
- [ ] Serial Monitor shows WiFi connected
- [ ] Receives packets and uploads to Supabase

**System Test:**
- [ ] Supabase table has new rows every 20s
- [ ] Dashboard shows data for all locations
- [ ] Real-time updates work (no refresh needed)

---

## 🎉 You're Done!

Your complete water quality monitoring system is now operational:

- ✅ 2 ESP32 devices communicating via LoRa (433MHz, up to 5-10km range)
- ✅ Real-time data transmission to cloud (Supabase)
- ✅ Live dashboard with 4 locations
- ✅ Sequential sensor data (100.1 → 200.1, then resets)
- ✅ All 4 sensors per location (pH, Turbidity, Temperature, TDS)

**Next Steps:**
1. Test with real sensors (replace hardcoded values with analogRead())
2. Deploy transmitters at actual lake locations
3. Add alerts for threshold violations
4. Extend battery life with deep sleep modes

Need help? Check the Troubleshooting section above!

