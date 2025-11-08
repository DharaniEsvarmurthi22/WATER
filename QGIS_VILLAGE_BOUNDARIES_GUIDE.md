# 🗺️ QGIS Village Boundaries Guide
## Complete Step-by-Step Tutorial for Creating Village Boundaries

---

## **📋 TABLE OF CONTENTS**

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Method 1: Google Earth + QGIS (RECOMMENDED)](#method-1-google-earth--qgis-recommended)
4. [Method 2: QGIS Direct Digitization](#method-2-qgis-direct-digitization)
5. [Method 3: Approximate Boundaries](#method-3-approximate-boundaries)
6. [Styling & Colors](#styling--colors)
7. [Adding Center Markers](#adding-center-markers)
8. [Exporting to KML](#exporting-to-kml)
9. [Uploading to Dashboard](#uploading-to-dashboard)
10. [Troubleshooting](#troubleshooting)

---

## **📌 OVERVIEW**

**Goal:** Create colored village boundary polygons + center markers for water monitoring dashboard

**What You'll Create:**
- ✅ Colored polygon boundaries (like district map)
- ✅ Center point markers for easy clicking
- ✅ KML file with proper naming convention
- ✅ Auto-integration with dashboard

**Time Required:** ~30 minutes per village

---

## **🔧 PREREQUISITES**

### **Software Needed:**

1. **Google Earth Pro** (Free)
   - Download: https://www.google.com/earth/versions/#earth-pro
   - Used for: Tracing village boundaries

2. **QGIS** (Free)
   - Download: https://qgis.org/en/site/forusers/download.html
   - Version: 3.28+ recommended
   - Used for: Styling, editing, exporting KML

### **Your Village Data:**

You need to know:
- ✅ Village name (e.g., "Nallampatti")
- ✅ Approximate location (district, taluk)
- ✅ Coordinates (latitude, longitude)

**Example Data:**
```
Village: Nallampatti
District: Salem
Taluk: Salem
Lat/Long: 11.5833, 78.1667
```

---

## **🌍 METHOD 1: Google Earth + QGIS (RECOMMENDED)**

### **⭐ Best For:** Accurate boundaries, production use

---

### **PART A: Trace Boundary in Google Earth**

#### **Step 1: Open Google Earth Pro**

1. Launch Google Earth Pro
2. Click **Tools** → **Options**
3. Set **Lat/Long format** to "Decimal Degrees"
4. Click **OK**

#### **Step 2: Find Your Village**

1. In the **Search** box (top-left), type:
   ```
   Nallampatti, Salem, Tamil Nadu
   ```

2. Press **Enter**
3. Google Earth will fly to the location
4. Zoom in until you see village boundaries clearly

**💡 TIP:** Use **Street View** (yellow person icon) to verify the village area

#### **Step 3: Trace the Village Boundary**

1. Click the **Add Polygon** button (toolbar)
   - OR: **Add** → **Polygon**

2. In the **New Polygon** dialog:
   - **Name:** Enter `Nallampatti` (EXACT name from database!)
   - **Description:** `நல்லம்பட்டி - Water monitoring location`
   - **Style/Color Tab:**
     - **Area:** Fill Opacity = 40%, Color = Green
     - **Lines:** Width = 3px, Color = Dark Green

3. **Click "OK"**

4. **Start tracing:**
   - Click points along the village boundary
   - Follow roads, water bodies, or natural boundaries
   - Make polygon shape by clicking 8-15 points
   - Close the polygon by clicking the first point again

**💡 TIPS:**
- Zoom in close (eye alt ~500-1000m)
- Follow visible boundaries (roads, fields, water bodies)
- Don't worry about perfection - approximate is fine
- Use satellite imagery dates (View → Historical Imagery)

#### **Step 4: Save as KML**

1. In **Places** panel (left), find your "Nallampatti" polygon
2. **Right-click** on it
3. Select **Save Place As...**
4. Choose:
   - **Save as type:** `.kml` (NOT .kmz!)
   - **File name:** `nallampatti_boundary.kml`
   - **Location:** `C:\Users\dharani\Documents\`
5. Click **Save**

**✅ You now have:** `nallampatti_boundary.kml`

---

### **PART B: Style in QGIS**

#### **Step 5: Open QGIS**

1. Launch QGIS Desktop
2. Create new project: **Project** → **New**

#### **Step 6: Load KML File**

1. **Layer** → **Add Layer** → **Add Vector Layer**
2. Click **...** button next to **Vector Dataset(s)**
3. Browse to: `C:\Users\dharani\Documents\nallampatti_boundary.kml`
4. Click **Add**
5. Click **Close**

**✅ You should see:** Green polygon on map

#### **Step 7: Style the Polygon**

1. **Right-click** on the KML layer → **Properties**
2. Go to **Symbology** tab
3. Click **Simple Fill**

4. **Set Fill Color:**
   - Click color square
   - Choose **Green** (#22c55e)
   - Set **Opacity:** 25%

5. **Set Outline (Stroke):**
   - **Stroke Color:** Dark Green (#00aa00)
   - **Stroke Width:** 3
   - **Stroke Style:** Solid line

6. Click **Apply** → **OK**

**💡 For Multiple Villages:**
Repeat for each village with DIFFERENT colors:
- Nallampatti: Green (#22c55e)
- Poolampatti: Orange (#f97316)
- Thumbalpatti: Blue (#3b82f6)
- Karipatti: Purple (#a855f7)
- Mallamooppampatti: Yellow (#eab308)

#### **Step 8: Add Village Center Marker**

1. **Layer** → **Create Layer** → **New Temporary Scratch Layer**
2. **Geometry type:** Point
3. **Layer name:** `village_markers`
4. Click **OK**

5. **Toggle Editing:** Click pencil icon (or press Ctrl+E)
6. **Add Point Feature:** Click "Add Point" button
7. **Click** at the center of your village polygon
8. In popup dialog:
   - **Name:** `Nallampatti` (same as polygon!)
9. Click **OK**

10. **Save Edits:** Click disk icon (or press Ctrl+S)
11. **Stop Editing:** Click pencil icon again

#### **Step 9: Style the Marker**

1. **Right-click** on `village_markers` layer → **Properties**
2. Go to **Symbology** tab
3. Click **Simple Marker**

4. **Set Marker:**
   - **Symbol:** Circle
   - **Size:** 10 (units: Pixels)
   - **Fill Color:** Green (#22c55e) - match polygon!
   - **Stroke Color:** White (#ffffff)
   - **Stroke Width:** 3

5. Click **Apply** → **OK**

**✅ You should see:** Colored circle at village center

---

### **PART C: Export to KML**

#### **Step 10: Merge Layers**

We need BOTH polygon and point in ONE KML file.

**Option A: Merge in QGIS** (Recommended)

1. **Vector** → **Data Management Tools** → **Merge Vector Layers**
2. **Input Layers:** Select BOTH:
   - `nallampatti_boundary` (polygon)
   - `village_markers` (points)
3. **Merged:** Save to: `C:\Users\dharani\Documents\nallampatti_merged.shp`
4. Click **Run**
5. Click **Close**

**Option B: Export Separately** (Then merge manually)

Skip this and use the KML template I already created!

#### **Step 11: Export Final KML**

1. **Right-click** on merged layer → **Export** → **Save Features As...**

2. **Settings:**
   - **Format:** Keyhole Markup Language [KML]
   - **File name:** `C:\Users\dharani\Desktop\w_dashboard\WATER\frontend\nallampatti_cluster.kml`
   - **CRS:** EPSG:4326 - WGS 84
   - **Geometry type:** Automatic
   - **Datasource Options:**
     - ☑ NameField: `name`
     - ☑ DescriptionField: `description`

3. Click **OK**

**✅ DONE!** You have created: `nallampatti_cluster.kml`

---

## **🎨 METHOD 2: QGIS Direct Digitization**

### **⭐ Best For:** When Google Earth doesn't show clear boundaries

---

#### **Step 1: Add Satellite Basemap to QGIS**

1. **Plugins** → **Manage and Install Plugins**
2. Search for: **QuickMapServices**
3. Click **Install Plugin**
4. Close dialog

5. **Web** → **QuickMapServices** → **Settings**
6. **More services** tab → Click **Get contributed pack**
7. Click **Save** → **OK**

8. **Web** → **QuickMapServices** → **Google** → **Google Satellite**

**✅ You should see:** Satellite imagery in QGIS!

#### **Step 2: Create New Shapefile**

1. **Layer** → **Create Layer** → **New Shapefile Layer**

2. **Settings:**
   - **File name:** `C:\Users\dharani\Documents\nallampatti_boundary.shp`
   - **Geometry type:** Polygon
   - **CRS:** EPSG:4326 - WGS 84

3. **New Field:**
   - **Name:** `name`
   - **Type:** Text data
   - **Length:** 100
   - Click **Add to Fields List**

4. **New Field:**
   - **Name:** `description`
   - **Type:** Text data
   - **Length:** 255
   - Click **Add to Fields List**

5. Click **OK**

#### **Step 3: Navigate to Village**

1. **View** → **Panels** → Enable **Coordinate Capture**
2. At bottom, click **CRS** → Select **EPSG:4326**
3. In **Search box** (top-right):
   - Type coordinates: `78.1667, 11.5833`
   - Press Enter

**OR use Go to XY plugin:**
1. **Plugins** → **Manage and Install Plugins**
2. Search: **Lat Lon Tools**
3. Install it
4. **Vector** → **Lat Lon Tools** → **Zoom to Lat Lon**
5. Enter: Lat = `11.5833`, Lon = `78.1667`
6. Click **Zoom**

#### **Step 4: Draw Polygon**

1. **Select** your shapefile layer
2. Click **Toggle Editing** (pencil icon)
3. Click **Add Polygon Feature** button (toolbar)

4. **Click points** around village boundary:
   - Click 8-15 points following visible boundaries
   - Right-click to finish polygon

5. In **Feature Attributes** dialog:
   - **name:** `Nallampatti`
   - **description:** `நல்லம்பட்டி`
   - Click **OK**

6. **Save Edits** (disk icon)
7. **Stop Editing** (pencil icon)

#### **Step 5: Style & Export**

Follow **PART B, Steps 7-11** from Method 1 above.

---

## **⚡ METHOD 3: Approximate Boundaries (Quick)**

### **⭐ Best For:** Testing, prototype, when exact boundaries not needed

---

#### **Use QGIS Buffer Tool**

1. Create point at village center (lat/lon)
2. **Vector** → **Geoprocessing Tools** → **Buffer**
3. **Distance:** `0.003` degrees (~330 meters)
4. **Segments:** 16 (makes circle smoother)
5. Click **Run**

**✅ Result:** Circular boundary around village

**⚠️ WARNING:** This is APPROXIMATE! Not real village boundary.

---

## **🎨 STYLING & COLORS**

### **Color Scheme (Match District Map)**

Use these colors for your 5 villages:

| Village | Fill Color | Hex Code | Outline Color |
|---------|-----------|----------|--------------|
| Nallampatti | Green | #22c55e | #00aa00 |
| Poolampatti | Orange | #f97316 | #cc5500 |
| Thumbalpatti | Blue | #3b82f6 | #0055ff |
| Karipatti | Purple | #a855f7 | #7700ff |
| Mallamooppampatti | Yellow | #eab308 | #ccaa00 |

### **Opacity Settings:**

- **Polygon Fill:** 25% (makes it semi-transparent)
- **Polygon Outline:** 80% (strong visible line)
- **Point Marker:** 90% (clearly visible)

---

## **📍 ADDING CENTER MARKERS**

### **Why Add Markers?**

Villages are small - boundaries might be hard to click on mobile!  
Center markers provide:
- ✅ Easy click target
- ✅ Clear visual indicator
- ✅ Better UX on mobile devices

### **How to Position Marker**

**Option 1: Visual Center**
- Just click middle of polygon

**Option 2: Geographic Centroid**
1. **Vector** → **Geometry Tools** → **Centroids**
2. **Input layer:** Your polygon layer
3. Click **Run**
4. **✅ Result:** Point at exact center!

**Option 3: Water Source Location**
- If monitoring a specific tank/pond, place marker there
- More accurate for data collection point

---

## **💾 EXPORTING TO KML**

### **CRITICAL: Naming Convention**

**⚠️ VERY IMPORTANT:** KML placemark names MUST match database `location_id`!

**Example:**
```sql
-- In database:
location_id = 'nallampatti'

-- In KML:
<Placemark>
  <name>Nallampatti</name>  ← Name gets converted to lowercase = 'nallampatti' ✅
</Placemark>
```

**Conversion Rule:**
```javascript
// Frontend code does this:
const locationId = name.toLowerCase().replace(/\s+/g, '');

// Examples:
"Nallampatti" → "nallampatti" ✅
"Poolam Patti" → "nallampatti" ❌ (space removed)
"poolampatti" → "poolampatti" ✅
```

**✅ CORRECT Names:**
- `Nallampatti` (capital N)
- `Poolampatti`
- `Thumbalpatti`
- `Karipatti`
- `Mallamooppampatti`

**❌ WRONG Names:**
- `Nallam Patti` (space - will break!)
- `nallampatti` (lowercase works but inconsistent)
- `Nallampatti Village` (extra word)

---

### **KML Export Checklist:**

Before exporting, verify:

- [ ] Layer name matches database
- [ ] No spaces in placemark names
- [ ] Coordinates are in WGS84 (EPSG:4326)
- [ ] Both polygon AND point features exist
- [ ] Colors are vibrant (not too transparent)
- [ ] File size < 5MB

---

## **☁️ UPLOADING TO DASHBOARD**

### **Option 1: Local File (Testing)**

1. Save KML to: `C:\Users\dharani\Desktop\w_dashboard\WATER\frontend\`
2. Filename: `nallampatti_cluster.kml`
3. Dashboard will auto-load it (already configured in `overlays-config.js`)

**✅ When to use:** Development, testing

---

### **Option 2: Supabase Storage (Production)**

#### **Step 1: Upload to Supabase**

1. Go to: https://supabase.com/dashboard/project/uvqcctheqvuilwfbpqcd
2. Click **Storage** (left sidebar)
3. Click **kml-overlays** bucket (or create it if missing)

**If bucket doesn't exist:**
1. Click **New bucket**
2. **Name:** `kml-overlays`
3. **Public bucket:** ☑ YES (important!)
4. Click **Create bucket**

4. Click **Upload file**
5. Select: `nallampatti_cluster.kml`
6. Click **Upload**

#### **Step 2: Make File Public**

1. Click the **3 dots** next to uploaded file
2. Select **Get public URL**
3. Copy the URL (you'll need it later)

#### **Step 3: Update Config**

Edit `frontend/overlays-config.js`:

```javascript
overlays: [
    {
        name: 'Nallampatti Cluster',
        source: 'supabase',  // Changed from 'local'
        file: 'nallampatti_cluster.kml',
        enabled: true,
        description: '5 villages with colored boundaries'
    }
]
```

**✅ When to use:** Production deployment, Netlify

---

### **Option 3: File Upload UI (Dynamic)**

1. Open dashboard: http://localhost:3000
2. Look for **"Upload Overlays"** section (left panel)
3. Click **Choose File**
4. Select your KML file
5. **Automatic:** File uploads, map refreshes!

**✅ When to use:** Adding new villages dynamically

---

## **🔧 TROUBLESHOOTING**

### **Problem 1: KML Not Showing on Map**

**Symptoms:**
- File uploads successfully
- No errors in console
- But polygon doesn't appear

**Solutions:**

✅ **Check 1: File loaded?**
```javascript
// Open browser console (F12)
// Look for:
✅ Loaded KML: Nallampatti Cluster (local)
```

✅ **Check 2: Geometry valid?**
- Open KML in Google Earth
- Does it show correctly there?
- If not, re-export from QGIS

✅ **Check 3: Coordinates order**
```xml
<!-- CORRECT: -->
<coordinates>78.1667,11.5833,0</coordinates>  ← longitude,latitude,altitude

<!-- WRONG: -->
<coordinates>11.5833,78.1667,0</coordinates>  ← latitude,longitude (WRONG!)
```

✅ **Check 4: Map bounds**
```javascript
// In console:
window.mapManager.map.getBounds()
// Does it include your village coordinates?
```

---

### **Problem 2: Popup Not Showing**

**Symptoms:**
- Polygon visible
- Click on it - nothing happens
- No console errors

**Solutions:**

✅ **Check 1: Name matches database**
```sql
-- Run in Supabase SQL Editor:
SELECT location_id, name FROM locations;

-- Compare with KML:
-- KML name = "Nallampatti"
-- Converted = "nallampatti"
-- Must match location_id exactly!
```

✅ **Check 2: Console logs**
```javascript
// Click polygon, check console:
🎯 KML polygon clicked: "Nallampatti" → location_id: nallampatti
```

✅ **Check 3: Location exists in DB**
```sql
SELECT * FROM locations WHERE location_id = 'nallampatti';
-- Should return 1 row
```

---

### **Problem 3: Wrong Colors**

**Symptoms:**
- All polygons same color
- Colors don't match template

**Solutions:**

✅ **Check 1: Feature properties**
```javascript
// Console after loading:
console.log(feature.properties.fillColor);
// Should show: #22c55e (green)
```

✅ **Check 2: Code updated?**
```javascript
// In map.js, check:
const villageColors = [
    '#22c55e', '#f97316', '#3b82f6', ...
];
// Should have 10 colors
```

✅ **Check 3: Clear browser cache**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

---

### **Problem 4: Popup Shows But No Data**

**Symptoms:**
- Popup appears
- Shows village name
- But sensors show "No data"

**Solutions:**

✅ **Check 1: ESP32 sent data?**
```sql
SELECT * FROM sensor_readings 
WHERE sensor_id LIKE 'nallampatti_%'
ORDER BY timestamp DESC
LIMIT 5;
```

✅ **Check 2: Sensor naming**
```
ESP32 sends: "nallampatti_ph:7.2"
Sensor ID created: "nallampatti_ph" ✅

Database has sensor_id: "nallampatti_ph_sensor" ❌
Won't match!
```

✅ **Check 3: Sensors exist in DB**
```sql
SELECT sensor_id, location_id FROM sensors 
WHERE location_id = 'nallampatti';
-- Should return 4 sensors (ph, turbidity, temperature, tds)
```

---

### **Problem 5: "View Dashboard" Button Doesn't Work**

**Symptoms:**
- Click "View Dashboard" in popup
- Nothing happens OR 404 error

**Solutions:**

✅ **Check 1: location.html exists**
```
File must exist at:
C:\Users\dharani\Desktop\w_dashboard\WATER\frontend\location.html
```

✅ **Check 2: URL correct**
```javascript
// Check console:
// Should show:
window.location.href = `location.html?location=nallampatti`

// NOT:
window.location.href = `location.html?location=Nallampatti`  ← Capital N breaks it!
```

✅ **Check 3: location.js handles it**
```javascript
// In location.js:
const params = new URLSearchParams(window.location.search);
const locationId = params.get('location');
console.log('Location ID:', locationId);  // Should be lowercase
```

---

### **Problem 6: File Upload Fails**

**Symptoms:**
- Click upload
- Error message or nothing happens

**Solutions:**

✅ **Check 1: File type**
```
Allowed: .kml, .geojson, .json
NOT allowed: .kmz, .zip, .txt
```

✅ **Check 2: File size**
```
Max size: 10MB
If larger, simplify polygon (fewer points)
```

✅ **Check 3: Supabase bucket exists**
```sql
-- In Supabase SQL:
SELECT * FROM storage.buckets WHERE name = 'kml-overlays';
-- Should return 1 row with public = true
```

✅ **Check 4: RLS policies**
```sql
-- In Supabase SQL Editor:
-- Check if bucket is public:
UPDATE storage.buckets 
SET public = true 
WHERE name = 'kml-overlays';
```

---

## **📚 ADDITIONAL RESOURCES**

### **QGIS Tutorials:**
- Official Docs: https://docs.qgis.org/
- Video Tutorials: https://www.qgistutorials.com/

### **Google Earth:**
- User Guide: https://support.google.com/earth/
- KML Reference: https://developers.google.com/kml/documentation/

### **Village Boundary Data Sources:**
- DataMeet: http://projects.datameet.org/maps/
- Survey of India: https://surveyofindia.gov.in/
- OpenStreetMap: https://www.openstreetmap.org/

---

## **✅ FINAL CHECKLIST**

Before deploying to production:

- [ ] All 5 villages have boundaries drawn
- [ ] Each village has unique color
- [ ] Center markers added for all villages
- [ ] KML names match database exactly
- [ ] File uploaded to Supabase storage
- [ ] Tested on local dashboard
- [ ] Popups show correct data
- [ ] "View Dashboard" button works
- [ ] Mobile responsive (test on phone)
- [ ] ESP32 data appears in popups
- [ ] Search finds all villages
- [ ] Filters work correctly
- [ ] Git committed and pushed
- [ ] Deployed to Netlify

---

## **🎯 QUICK REFERENCE CARD**

```
📁 Files:
  KML Template: frontend/nallampatti_cluster.kml
  Config: frontend/overlays-config.js
  Map Code: frontend/map.js
  
🎨 Colors:
  Green:  #22c55e (Nallampatti)
  Orange: #f97316 (Poolampatti)
  Blue:   #3b82f6 (Thumbalpatti)
  Purple: #a855f7 (Karipatti)
  Yellow: #eab308 (Mallamooppampatti)
  
🔤 Naming:
  KML: "Nallampatti" (capital)
  DB:  "nallampatti" (lowercase)
  Auto-converts: name.toLowerCase()
  
📊 Database:
  Table: locations
  Key: location_id (lowercase, no spaces)
  Coords: latitude, longitude (decimal degrees)
  
🌐 Testing:
  Local: http://localhost:3000
  Production: [your-netlify-url]
```

---

**💡 TIP:** Bookmark this guide for reference when adding new villages!

**🚀 Ready to create your boundaries? Start with Method 1!**
