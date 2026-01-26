# Dynamic KML System - Complete Automation

## 🎯 System Overview

**NO PREDEFINED LOCATIONS!** Everything is dynamic based on uploaded KML files.

### How It Works:

```
1. ESP32 Device
   ↓
   Sends: GPS coordinates (lat/lon) + sensor data
   Does NOT send: village names, location names
   
2. User Uploads KML File
   ↓
   KML contains: boundaries, village names, markers
   System stores: KML file linked to device
   
3. Dashboard Loads Data
   ↓
   Reads: GPS coordinates from database
   Matches: Coordinates to KML boundaries
   Displays: Village name from KML automatically
```

---

## 📡 ESP32 Configuration

### What ESP32 Sends:

```json
{
  "device_id": "ESP32_001",
  "device_name": "Water Monitor 1",
  "latitude": 11.6789,
  "longitude": 78.1234,
  "water_level": 67.23,
  "flow_rate": 28.45,
  "ph": 7.32,
  "turbidity": 2.15,
  "temperature": 23.45,
  "tds": 856,
  "status": "Good"
}
```

**Note:** NO location field! Only GPS coordinates.

### Configure Your Base Location:

```cpp
// ESP32_Supabase_Direct.ino

// Set your actual GPS coordinates here
float baseLatitude = 11.6643;      // Your device location
float baseLongitude = 78.1460;     // Your device location
float gpsVariation = 0.05;         // Random variation for testing
```

**For Real Sensors:**
- Use actual GPS module (NEO-6M, NEO-7M, etc.)
- Send real coordinates
- Remove random variation

**For Testing:**
- Keeps one base location
- Adds small random variation
- Simulates movement within area

---

## 🗺️ KML File Structure

### What Your KML Should Contain:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>My Village Boundaries</name>
    
    <!-- Village 1 -->
    <Placemark>
      <name>Edappadi</name>
      <description>Edappadi Village Boundary</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              77.8200,11.6850,0
              77.8400,11.6850,0
              77.8400,11.7050,0
              77.8200,11.7050,0
              77.8200,11.6850,0
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    
    <!-- Village 2 -->
    <Placemark>
      <name>Mettur</name>
      <description>Mettur Village Boundary</description>
      <Polygon>
        <!-- coordinates here -->
      </Polygon>
    </Placemark>
    
    <!-- Add more villages as needed -->
  </Document>
</kml>
```

### KML Can Have:

- ✅ **Any village names** - system reads from `<name>` tag
- ✅ **Any number of villages** - no limit
- ✅ **Polygons** - for boundaries
- ✅ **Points** - for specific markers
- ✅ **Lines** - for routes, rivers, etc.
- ✅ **Folders** - to organize regions
- ✅ **Multiple layers** - different types of data

---

## 🎨 Creating KML Files

### Method 1: Google Earth (Easiest)

1. Open Google Earth Pro (desktop)
2. Navigate to your area
3. Click **Add Polygon** tool
4. Draw boundary around village
5. Name it (e.g., "Edappadi")
6. Right-click → Save Place As
7. Save as .kml file

### Method 2: QGIS (Professional)

1. Open QGIS
2. Load base map layer
3. Create new vector layer
4. Draw polygons for villages
5. Add attribute data (village names)
6. Export as KML

### Method 3: Online Tools

- **Google My Maps** - draw on web, export KML
- **GeoJSON.io** - draw online, convert to KML
- **KML Generator** tools

---

## 📊 How Dashboard Processes Data

### Algorithm:

```javascript
// 1. Load KML file
const kmlData = await loadKMLFromStorage(deviceId);
const regions = parseKML(kmlData);  // Extract all polygons and names

// 2. Get sensor reading
const reading = {
  latitude: 11.6789,
  longitude: 78.1234,
  // ... other sensor data
};

// 3. Find which region contains this point
for (const region of regions) {
  if (pointInPolygon(reading, region.boundary)) {
    reading.locationName = region.name;  // "Edappadi"
    break;
  }
}

// 4. Display on map
addMarker(reading.latitude, reading.longitude, {
  title: reading.locationName,
  data: reading
});
```

### Point-in-Polygon Check:

The dashboard automatically determines if GPS coordinates fall within KML boundaries:

```
GPS: (11.6789, 78.1234)
        ↓
Check against all KML polygons
        ↓
Found inside "Edappadi" boundary
        ↓
Display: "Edappadi - pH: 7.32, Good"
```

---

## 🔄 Complete Workflow

### User A (Edappadi Farmer):

1. **Setup Device:**
   ```cpp
   float baseLatitude = 11.6959;   // Edappadi coordinates
   float baseLongitude = 77.8331;
   ```

2. **Claim Device:** ESP32_001

3. **Create KML:**
   - Open Google Earth
   - Draw boundary around Edappadi village
   - Save as `edappadi.kml`

4. **Upload KML:**
   - Go to upload_kml.html
   - Select device: ESP32_001
   - Upload edappadi.kml

5. **View Dashboard:**
   - Map loads with Edappadi boundary
   - ESP32_001 readings appear inside boundary
   - Automatically labeled "Edappadi"

### User B (Mettur Farmer):

1. **Setup Device:**
   ```cpp
   float baseLatitude = 11.7969;   // Mettur coordinates
   float baseLongitude = 77.8019;
   ```

2. **Claim Device:** ESP32_002

3. **Create KML:**
   - Draw boundary for Mettur village
   - Save as `mettur.kml`

4. **Upload KML:**
   - Select device: ESP32_002
   - Upload mettur.kml

5. **View Dashboard:**
   - Map shows Mettur boundary
   - ESP32_002 readings labeled "Mettur"
   - Completely separate from User A

---

## 🎯 Advanced Use Cases

### Multiple Villages in One KML:

```xml
<kml>
  <Document>
    <Placemark><name>Village 1</name>...</Placemark>
    <Placemark><name>Village 2</name>...</Placemark>
    <Placemark><name>Village 3</name>...</Placemark>
  </Document>
</kml>
```

Dashboard automatically:
- Shows all 3 boundaries
- Matches readings to correct village
- Labels each reading with village name

### Different KML Layers:

User can upload KML with:
- Village boundaries (polygons)
- Water sources (points)
- Pipeline routes (lines)
- Soil types (polygons with different colors)

All displayed together on map!

### Dynamic Region Updates:

1. Village boundary changes
2. User uploads new KML with updated boundary
3. Old KML replaced
4. Dashboard reloads
5. New boundary displayed
6. Readings automatically reclassified

---

## 🗄️ Database Structure

### sensor_readings table:

```sql
CREATE TABLE sensor_readings (
    device_id TEXT,
    latitude DOUBLE PRECISION NOT NULL,  -- Required!
    longitude DOUBLE PRECISION NOT NULL, -- Required!
    water_level DOUBLE PRECISION,
    ph DOUBLE PRECISION,
    -- ... other sensors
);
```

**No location column!** Location determined from KML.

### kml_overlays table:

```sql
CREATE TABLE kml_overlays (
    owner_user_id UUID,
    device_identifier TEXT,  -- Links to device
    storage_path TEXT,       -- Path to KML file
    -- ... metadata
);
```

Links KML to device, not to specific location name.

---

## 🚀 Testing the System

### Test 1: Single Village

1. Upload KML with "Village A" boundary
2. ESP32 sends coords inside boundary
3. Dashboard shows: "Village A - pH: 7.2"

### Test 2: Multiple Villages

1. Upload KML with 5 villages
2. ESP32 sends random coords
3. Dashboard shows correct village name each time

### Test 3: Outside Boundaries

1. ESP32 sends coords outside all KML boundaries
2. Dashboard shows: "Unknown Location" or just coordinates
3. Still displays sensor data

### Test 4: KML Replace

1. Upload village_old.kml
2. Verify boundary on map
3. Upload village_new.kml (different boundary)
4. Old boundary disappears
5. New boundary appears
6. Readings automatically updated

---

## 📱 Mobile GPS Support (Future)

If using mobile app to capture readings:

```javascript
// Get current GPS location
navigator.geolocation.getCurrentPosition((position) => {
  const reading = {
    device_id: "MOBILE_001",
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    // ... sensor data
  };
  
  sendToSupabase(reading);
});
```

Dashboard automatically matches to KML regions!

---

## 🎨 Visualization Features

### On Dashboard:

1. **KML Boundaries** - Colored polygons
2. **Sensor Markers** - Points with data
3. **Auto Labels** - Village names from KML
4. **Color Coding** - Status-based (Good/Warning/Critical)
5. **Popups** - Click marker to see all sensor data
6. **Legend** - Shows which colors mean what
7. **Filters** - Show/hide specific regions

---

## 🔧 No Hardcoded Locations!

### Old System (REMOVED):
```cpp
const char* locations[] = {"edappadi", "mettur", ...};
```

### New System:
```cpp
// Just send GPS coordinates
float latitude = getCurrentGPS_Lat();
float longitude = getCurrentGPS_Lon();
```

**Everything else comes from KML!** 🎉

---

## 📋 Summary

✅ **ESP32:** Sends GPS + sensor data (no location names)
✅ **User:** Creates KML with ANY villages/markers
✅ **Upload:** Links KML to device
✅ **Dashboard:** Automatically reads village names from KML
✅ **Matching:** GPS coords matched to KML boundaries
✅ **Display:** Shows correct village name + sensor data
✅ **Dynamic:** Change KML = instant update
✅ **Scalable:** Works with 1 village or 1000 villages

**Complete automation!** No predefined locations anywhere in the system.
