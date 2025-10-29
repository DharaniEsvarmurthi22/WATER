# 🎨 Dynamic Popup System Guide

## Overview
Your dashboard now has a **fully dynamic popup system** that displays village information when clicking on KML boundary polygons. The popup content is configured through:
1. **Database** (popup_config table)
2. **KML file** (ExtendedData attributes)
3. **Real-time sensor data** (automatically fetched)

---

## 📋 How It Works

When you click a village boundary on the map:
1. ✅ Fetches popup configuration from `popup_config` table
2. ✅ Gets latest sensor readings from database
3. ✅ Merges KML attributes + database data
4. ✅ Displays dynamic popup with:
   - Village name
   - Current sensor values (pH, Turbidity, Temperature, TDS)
   - Custom fields (district, population, etc.)
   - Last updated timestamp
   - "View Full Dashboard" button

---

## 🚀 Adding a New Village (Complete Workflow)

### Step 1: Create Village Boundary in QGIS

1. **Open QGIS** and add basemap (Google Satellite)

2. **Create new polygon layer:**
   - Layer → Create Layer → New Shapefile Layer
   - Geometry: **Polygon**
   - Add fields:
     - `name` (Text, 100)
     - `location_id` (Text, 50)
     - `district` (Text, 50) *(optional)*
     - `description` (Text, 200) *(optional)*

3. **Draw village boundary:**
   - Toggle Editing (pencil icon)
   - Add Polygon Feature
   - Draw around village area
   - Fill attributes:
     ```
     name: Aravakurichi
     location_id: aravakurichi
     district: Karur
     description: Main water source: River Cauvery
     ```

4. **Export to KML:**
   - Right-click layer → Export → Save Features As
   - Format: **Keyhole Markup Language [KML]**
   - File: `village_boundaries.kml`
   - CRS: **EPSG:4326 - WGS 84**

5. **Copy KML to frontend folder:**
   ```powershell
   Copy-Item "path\to\village_boundaries.kml" "C:\Users\dharani\Desktop\w_dashboard\WATER\frontend\"
   ```

---

### Step 2: Add to Database

Run this SQL in Supabase SQL Editor:

```sql
-- 1. Add location
INSERT INTO locations (location_id, name, latitude, longitude)
VALUES ('aravakurichi', 'Aravakurichi', 10.9687, 78.1037);

-- 2. Add sensors
INSERT INTO sensors (sensor_id, location_id, sensor_type, status)
SELECT 
    'aravakurichi_' || sensor_type,
    (SELECT id FROM locations WHERE location_id = 'aravakurichi'),
    sensor_type,
    'active'
FROM (VALUES ('ph'), ('turbidity'), ('temperature'), ('tds')) AS t(sensor_type);

-- 3. Configure popup display
INSERT INTO popup_config (
    location_id,
    popup_title,
    popup_description,
    show_sensors,
    custom_fields
) VALUES (
    'aravakurichi',
    'Aravakurichi Water Quality Station',
    'Real-time monitoring of village water supply',
    ARRAY['ph', 'turbidity', 'temperature', 'tds'],
    '{"district": "Karur", "population": "15000", "source": "River Cauvery"}'::jsonb
);
```

---

### Step 3: Update ESP32 Sender (if using hardware)

Add village to rotation in `ESP32_LoRa_Sender.ino`:

```cpp
String locations[] = {
    "nallampatti", 
    "poolampatti", 
    "thumbalpatti", 
    "karipatti", 
    "mallamooppampatti",
    "aravakurichi"  // ← Add new village
};
```

---

### Step 4: Update KML Configuration

Edit `frontend/overlays-config.js`:

```javascript
export const kmlOverlays = [
    {
        name: 'Nallampatti Cluster',
        url: './nallampatti_cluster.kml',
        visible: true
    },
    {
        name: 'Village Boundaries',  // ← Your new KML file
        url: './village_boundaries.kml',
        visible: true
    }
];
```

---

### Step 5: Test & Deploy

```powershell
# 1. Test locally
cd C:\Users\dharani\Desktop\w_dashboard\WATER\frontend
http-server -p 3000

# 2. Commit to Git
cd ..
git add .
git commit -m "Added Aravakurichi village with dynamic popup"
git push origin Main

# 3. Deploy to Netlify (automatic if connected to GitHub)
```

---

## ⚙️ Customizing Popup Content

### Show/Hide Sensors

```sql
-- Show only pH and Temperature
UPDATE popup_config
SET show_sensors = ARRAY['ph', 'temperature']
WHERE location_id = 'aravakurichi';
```

### Add Custom Fields

```sql
-- Add population, water source, contact info
UPDATE popup_config
SET custom_fields = '{
    "district": "Karur",
    "population": "15000",
    "water_source": "River Cauvery",
    "contact": "9876543210",
    "installed_date": "2025-01-15"
}'::jsonb
WHERE location_id = 'aravakurichi';
```

### Change Popup Title

```sql
UPDATE popup_config
SET popup_title = 'Aravakurichi - Smart Water Monitoring'
WHERE location_id = 'aravakurichi';
```

### Hide "View Dashboard" Button

```sql
UPDATE popup_config
SET show_view_button = false
WHERE location_id = 'aravakurichi';
```

---

## 🎨 Popup Appearance

The popup automatically displays:

```
┌─────────────────────────────────────┐
│  📍 Aravakurichi Water Quality      │
│  Real-time monitoring of village    │
├─────────────────────────────────────┤
│  💧 pH Level:          7.2          │
│  🌊 Turbidity:         15 NTU       │
│  🌡️ Temperature:       28°C         │
│  ⚡ TDS:               250 ppm      │
├─────────────────────────────────────┤
│  District:             Karur        │
│  Population:           15000        │
│  Water_source:         River Cauvery│
├─────────────────────────────────────┤
│  📊 Last Updated: 2 mins ago        │
│                                     │
│  [🔍 View Full Dashboard]           │
└─────────────────────────────────────┘
```

---

## 🔍 Verification Queries

```sql
-- Check if popup config exists
SELECT * FROM popup_config WHERE location_id = 'aravakurichi';

-- View current sensor readings
SELECT 
    sensor_id,
    value,
    timestamp,
    NOW() - timestamp as age
FROM sensor_readings
WHERE sensor_id LIKE 'aravakurichi_%'
ORDER BY timestamp DESC
LIMIT 10;

-- See all villages with popup config
SELECT 
    pc.location_id,
    pc.popup_title,
    pc.show_sensors,
    pc.custom_fields,
    COUNT(sr.sensor_id) as reading_count
FROM popup_config pc
JOIN locations l ON pc.location_id = l.location_id
LEFT JOIN sensor_readings sr ON sr.sensor_id LIKE pc.location_id || '_%'
GROUP BY pc.location_id, pc.popup_title, pc.show_sensors, pc.custom_fields;
```

---

## 🎯 Key Features

✅ **100% Dynamic** - No frontend code changes needed
✅ **Database-Driven** - All config in popup_config table
✅ **Real-time Data** - Fetches latest sensor readings
✅ **Customizable** - Show/hide any sensors or custom fields
✅ **Automatic Updates** - Changes reflect immediately
✅ **KML Integration** - Works with QGIS-generated boundaries
✅ **Mobile Friendly** - Responsive popup design

---

## 🐛 Troubleshooting

**Popup not showing?**
- Check browser console (F12) for errors
- Verify KML file is in `frontend` folder
- Confirm `location_id` in KML matches database

**No sensor data?**
- Run verification query to check sensor_readings table
- Verify ESP32 is sending data with correct location_id
- Check insert_reading function logs

**Custom fields not appearing?**
- Verify JSON format in custom_fields column
- Use single quotes for JSON keys: `'{"key": "value"}'::jsonb`

---

## 📚 Files Modified

1. ✅ `create_popup_config.sql` - Database schema
2. ✅ `frontend/map.js` - Popup logic (lines 623-860)
3. ✅ `frontend/style.css` - Popup styles (lines 480-600)
4. ✅ `frontend/overlays-config.js` - KML configuration

---

**Your dashboard is now fully dynamic!** 🎉

Add villages by:
1. Drawing boundaries in QGIS → Export KML
2. INSERT into database tables
3. Everything updates automatically!
