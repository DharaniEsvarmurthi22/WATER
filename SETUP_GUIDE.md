# 🚀 Complete Setup Guide - Automated KML System

## 🎯 What This Does

**Upload ANY KML file** (like `nallampatti_cluster.kml`) and the system automatically:
- ✅ Reads village names from your KML
- ✅ Reads boundaries from your KML  
- ✅ Matches GPS coordinates to regions
- ✅ Displays data with correct location names

**Change KML file = Zero code changes needed!** 🎉

---

## 📋 Prerequisites

- ESP32 board
- Arduino IDE installed
- Supabase account (free tier works)
- KML file of your area (like `nallampatti_cluster.kml`)

---

## Step 1️⃣: Setup Supabase Database

### 1.1 Create Tables

Go to **Supabase Dashboard** → **SQL Editor** → Run these files:

**File 1:** `create_sensor_readings_table.sql`
```sql
-- This creates the table for ESP32 data
-- NO location column - everything from KML!
```

**File 2:** `create_kml_overlays.sql`
```sql
-- This creates the table for KML files
-- Links KML to devices automatically
```

### 1.2 Get Credentials

1. Go to **Settings** → **API**
2. Copy **Project URL**: `https://xxxxx.supabase.co`
3. Copy **anon/public key**: `eyJhbG...`

---

## Step 2️⃣: Configure ESP32

### 2.1 Open Arduino IDE

Install library: **ArduinoJson** (Tools → Manage Libraries)

### 2.2 Edit Code

Open `ESP32_Supabase_Direct.ino` and change:

```cpp
// WiFi credentials
const char* ssid = "YourWiFiName";
const char* password = "YourWiFiPassword";

// Supabase credentials
const char* supabaseUrl = "https://xxxxx.supabase.co";
const char* supabaseKey = "eyJhbG...";

// Device ID
const char* deviceId = "ESP32_001";

// Your GPS location (where ESP32 is installed)
float currentLatitude = 11.4102;    // Example: Nallampatti area
float currentLongitude = 77.7197;
```

### 2.3 Upload to ESP32

1. Select **Board**: ESP32 Dev Module
2. Select **Port**: COM port
3. Click **Upload**
4. Open **Serial Monitor** (115200 baud)

You'll see:
```
╔════════════════════════════════════════╗
║  ESP32 → Supabase → KML Dashboard     ║
║  FULLY AUTOMATED - Works with ANY KML ║
╚════════════════════════════════════════╝

✓ WiFi Connected!
📍 Sending GPS coordinates + sensor data
🗺️  Dashboard will automatically match to uploaded KML

📊 Generated Sensor Readings:
   📍 GPS: 11.410200, 77.719700
   💧 Water Level: 67.23 cm
   🌊 Flow Rate: 28.45 L/min
   ✓ Status: Good
   🗺️  Location: [Auto-detected from KML]

✅ Data sent successfully!
```

---

## Step 3️⃣: Upload Your KML File

### 3.1 Prepare KML

You have `nallampatti_cluster.kml` - keep it as is!
It contains your village boundaries and names.

**Your KML can have:**
- Any village names
- Any number of villages
- Polygons, points, lines
- Multiple layers

### 3.2 Login to Dashboard

Open your dashboard (`index.html`) and sign in.

### 3.3 Claim Device

1. Click **"Claim Device"** button
2. Enter Device ID: `ESP32_001`
3. Enter Secret (set in database)
4. Click **Claim**

### 3.4 Upload KML

1. Go to **Upload KML** page
2. Select your device: **ESP32_001**
3. Choose file: **nallampatti_cluster.kml**
4. Click **Upload**

Done! ✅

---

## Step 4️⃣: View Dashboard

Your dashboard now shows:

1. **Map** - Centered on your area
2. **KML Boundaries** - Villages from your KML file
3. **Sensor Markers** - ESP32 location with data
4. **Auto Labels** - Village names from KML
5. **Real-time Updates** - Every 15 seconds

---

## 🔄 How Automation Works

```
┌─────────────┐
│   ESP32     │ Sends: GPS (11.4102, 77.7197) + sensor data
└──────┬──────┘
       │
       ↓ WiFi
┌─────────────┐
│  Supabase   │ Stores in sensor_readings table
└──────┬──────┘
       │
       ↓ Query
┌─────────────┐
│  Dashboard  │ 
└──────┬──────┘
       │
       ├→ Loads: nallampatti_cluster.kml
       │  Parses: Village boundaries & names
       │
       ├→ Gets: GPS coordinates from database
       │
       └→ Matches: GPS to KML boundaries
          Result: "Nallampatti Village - pH: 7.2"
```

**No manual work!** Everything automatic.

---

## 🎨 Change KML File

### Scenario: Boundary updated or new villages added

1. Edit KML in Google Earth
2. Save as new file
3. Go to Upload KML page
4. Select same device: ESP32_001
5. Upload new KML

**System automatically:**
- ✅ Deletes old KML
- ✅ Uploads new KML
- ✅ Refreshes map
- ✅ Re-matches all GPS coordinates
- ✅ Updates location names

**Zero code changes!** 🎉

---

## 🔧 For Different Locations

### Example: Friend wants to use in different village

**Friend's Steps:**

1. **Get ESP32:** Configure with their WiFi
   ```cpp
   const char* deviceId = "ESP32_002";  // Different ID
   float currentLatitude = 12.5678;     // Their GPS
   float currentLongitude = 78.9012;
   ```

2. **Create KML:** Draw their village boundaries

3. **Upload to Dashboard:**
   - Claim ESP32_002
   - Upload their KML file

4. **Done!** Their dashboard shows their villages.

**Your system and theirs are completely separate!** ✅

---

## 📊 Multiple Villages in One KML

Your `nallampatti_cluster.kml` can have:

```xml
<kml>
  <Document>
    <Placemark>
      <name>Nallampatti</name>
      <Polygon><!-- boundary --></Polygon>
    </Placemark>
    <Placemark>
      <name>Kadambur</name>
      <Polygon><!-- boundary --></Polygon>
    </Placemark>
    <Placemark>
      <name>Naduvalur</name>
      <Polygon><!-- boundary --></Polygon>
    </Placemark>
  </Document>
</kml>
```

Dashboard automatically:
- Shows all 3 boundaries
- Matches GPS to correct village
- Labels: "Kadambur - pH: 7.2" or "Naduvalur - Good"

---

## 🐛 Troubleshooting

### ESP32 not connecting to WiFi
- Check SSID/password spelling
- Ensure 2.4GHz network (not 5GHz)

### Data not reaching Supabase
- Check Supabase URL and key
- Verify RLS policies (see SQL files)
- Check Serial Monitor for error codes

### KML not showing on map
- Verify device is claimed
- Check KML file is valid (open in Google Earth)
- Refresh dashboard page

### Wrong location name
- Check GPS coordinates are inside KML boundaries
- Verify KML has `<name>` tags for each region

---

## 📝 Summary

### Files You Need:

1. ✅ **ESP32_Supabase_Direct.ino** - Universal ESP32 code
2. ✅ **create_sensor_readings_table.sql** - Database for sensor data
3. ✅ **create_kml_overlays.sql** - Database for KML files
4. ✅ **upload_kml.html** - Upload page
5. ✅ **nallampatti_cluster.kml** - Your village boundaries

### Configuration Points:

1. **ESP32:** WiFi + Supabase + GPS + Device ID
2. **Supabase:** Run 2 SQL files
3. **Dashboard:** Upload your KML file

### Zero Maintenance:

- ✅ Add villages → Just update KML
- ✅ Change boundaries → Just upload new KML
- ✅ Add devices → Just claim and upload KML
- ✅ No code changes ever!

---

## 🎯 Quick Test

1. Upload ESP32 code → Serial Monitor shows data
2. Check Supabase → Table has rows
3. Upload KML → File in storage
4. View Dashboard → Map shows boundaries + data

**Complete automation achieved!** 🚀
