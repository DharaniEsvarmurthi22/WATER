# 🗺️ CREATE VILLAGE BOUNDARIES - STEP BY STEP

## **PART 1: INSTALL & SETUP QGIS**

### **Step 1: Install QGIS**
1. Download from: https://qgis.org/en/site/forusers/download.html
2. Install QGIS Desktop (latest version)
3. Open QGIS

---

### **Step 2: Install Required Plugins**

**2.1: Open Plugin Manager**
- Click **Plugins** → **Manage and Install Plugins**

**2.2: Install QuickMapServices**
- Search: `QuickMapServices`
- Click **Install Plugin**
- Click **Close**

**2.3: Get More Basemaps**
- Click **Web** → **QuickMapServices** → **Settings**
- Click **More services** tab
- Click **Get contributed pack**
- Click **Save** → **OK**

**2.4: Add Google Satellite**
- Click **Web** → **QuickMapServices** → **Google** → **Google Satellite**
- ✅ You should see satellite imagery!

---

## **PART 2: NAVIGATE TO YOUR VILLAGE**

### **Step 3: Install Lat Lon Tools Plugin**

**3.1: Open Plugin Manager**
- **Plugins** → **Manage and Install Plugins**

**3.2: Search for Lat Lon Tools**
- Search: `Lat Lon Tools`
- Click **Install Plugin**
- Click **Close**

### **Step 4: Go to Nallampatti**

**METHOD 1: Manual Navigation (Works in ALL QGIS versions)**

**4.1: Check Map CRS**
- Look at bottom-right corner of QGIS
- Click on the CRS button (should show something like "EPSG:3857")
- Search for: `4326`
- Select **EPSG:4326 - WGS 84**
- Click **OK**

**4.2: Use Coordinate Locator Bar**
- Look at the **bottom** of QGIS window
- You'll see coordinate display showing your mouse position
- In the **View** menu → Click **Panels** → Enable **Coordinate Capture** (if not visible)

**4.3: Navigate Manually**
1. Type in search bar at top: `Nallampatti, Tamil Nadu, India`
2. OR use mouse to pan and zoom:
   - **Pan**: Hold mouse wheel and drag
   - **Zoom**: Scroll mouse wheel
   - Target area: Salem district, Tamil Nadu

**4.4: Fine-tune Position**
- Zoom in until you see villages/roads clearly
- Look for Nallampatti area (near Salem)
- Coordinates to match (shown at bottom): **78.1667, 11.5833**

---

**METHOD 2: Use Locator Bar (Quick)**

**4.1: Use Built-in Locator**
- Press **Ctrl + K** (opens locator bar at bottom)
- Type: `go to 78.1667 11.5833`
- Press **Enter**
- Map should center on Nallampatti!

**Format:** `go to LONGITUDE LATITUDE` (notice: longitude first!)

---

**METHOD 3: Create Temporary Point**

**4.1: Create Scratch Layer**
- **Layer** → **Create Layer** → **New Temporary Scratch Layer**
- **Geometry**: Point
- **CRS**: EPSG:4326
- Click **OK**

**4.2: Add Point with Coordinates**
- Click **Toggle Editing** (pencil icon)
- Click **Add Point Feature**
- In **Vertex Tool Panel** or **Feature Attributes**, manually enter:
  - **X (Longitude)**: 78.1667
  - **Y (Latitude)**: 11.5833
- Click **OK**
- **Right-click** on layer → **Zoom to Layer**
- ✅ Map centers on Nallampatti!

---

## **PART 3: CREATE BOUNDARY LAYER**

### **Step 5: Create New Shapefile**

**5.1: Create Layer**
- Click **Layer** → **Create Layer** → **New Shapefile Layer**

**5.2: Configure Layer**
```
File name: C:\Users\dharani\Documents\nallampatti_boundary.shp
Geometry type: Polygon
CRS: EPSG:4326 - WGS 84
```

**5.3: Add Fields**

**Field 1:**
```
Name: name
Type: Text data
Length: 100
```
- Click **Add to Fields List**

**Field 2:**
```
Name: description
Type: Text data
Length: 255
```
- Click **Add to Fields List**

**Field 3:**
```
Name: color
Type: Text data
Length: 10
```
- Click **Add to Fields List**

**5.4: Create Layer**
- Click **OK**

---

## **PART 4: DRAW VILLAGE BOUNDARY**

### **Step 6: Start Editing**

**6.1: Toggle Editing Mode**
- Select your `nallampatti_boundary` layer (click on it)
- Click the **Toggle Editing** button (pencil icon)
- OR press **Ctrl + E**

**6.2: Select Add Polygon Tool**
- Click **Add Polygon Feature** button (polygon icon in toolbar)
- Cursor changes to crosshair

### **Step 7: Trace Boundary**

**7.1: Zoom In Close**
- Use mouse wheel to zoom in
- Target zoom level: ~1:5000 (see bottom right)

**7.2: Click to Draw**
```
Strategy: Follow visible boundaries like:
- Roads
- Water bodies (tanks/ponds)
- Field boundaries
- Tree lines
```

**How to Draw:**
1. **Left-click** at starting point (e.g., northwest corner)
2. **Left-click** along the boundary (8-15 points)
3. Follow the edge of the village area
4. **Right-click** to finish polygon

**7.3: Fill Attributes**
When dialog appears:
```
name: Nallampatti
description: நல்லம்பட்டி
color: green
```
- Click **OK**

**7.4: Save Edits**
- Click **Save Layer Edits** (disk icon)
- OR press **Ctrl + S**

---

## **PART 5: STYLE THE POLYGON**

### **Step 8: Apply Green Color**

**8.1: Open Properties**
- Right-click on `nallampatti_boundary` layer
- Select **Properties**

**8.2: Go to Symbology**
- Click **Symbology** tab (left side)

**8.3: Style the Fill**
- Click on **Simple Fill**

**Fill Color:**
- Click the color square
- Enter HEX: `#22c55e` (green)
- Set **Opacity**: 25%

**Outline (Stroke):**
```
Stroke color: #00aa00 (dark green)
Stroke width: 3
Stroke style: Solid line
```

**8.4: Apply**
- Click **Apply** → **OK**

---

## **PART 6: ADD CENTER MARKER**

### **Step 9: Create Point Layer**

**9.1: Create Point Layer**
- **Layer** → **Create Layer** → **New Shapefile Layer**

**9.2: Configure**
```
File name: C:\Users\dharani\Documents\nallampatti_marker.shp
Geometry type: Point
CRS: EPSG:4326 - WGS 84
```

**9.3: Add Fields**
Same as before:
- `name` (Text, 100)
- `description` (Text, 255)
- `color` (Text, 10)

**9.4: Create**
- Click **OK**

### **Step 10: Place Marker at Center**

**10.1: Start Editing**
- Select `nallampatti_marker` layer
- Click **Toggle Editing** (Ctrl + E)

**10.2: Add Point**
- Click **Add Point Feature** button
- Click at the **center** of your polygon
- OR click on the main water tank/monitoring location

**10.3: Fill Attributes**
```
name: Nallampatti
description: நல்லம்பட்டி
color: green
```
- Click **OK**

**10.4: Save**
- **Save Layer Edits** (Ctrl + S)
- **Stop Editing** (Ctrl + E)

### **Step 11: Style the Marker**

**11.1: Open Properties**
- Right-click `nallampatti_marker` → **Properties**

**11.2: Symbology**
- Click **Symbology** tab
- Click **Simple Marker**

**11.3: Style**
```
Symbol: Circle
Size: 10 pixels
Fill color: #22c55e (green)
Stroke color: #ffffff (white)
Stroke width: 3
```

**11.4: Apply**
- Click **Apply** → **OK**

---

## **PART 7: EXPORT TO KML**

### **Step 12: Merge Layers**

**12.1: Open Merge Tool**
- **Vector** → **Data Management Tools** → **Merge Vector Layers**

**12.2: Select Layers**
- Click **...** next to "Input layers"
- Check BOTH:
  - ☑ `nallampatti_boundary`
  - ☑ `nallampatti_marker`
- Click **OK**

**12.3: Save Output**
```
Merged: Save to temporary file
```
- Click **Run**
- Click **Close**

### **Step 13: Export as KML**

**13.1: Export Merged Layer**
- Right-click on the **Merged** layer
- Select **Export** → **Save Features As...**

**13.2: Configure Export**
```
Format: Keyhole Markup Language [KML]

File name: C:\Users\dharani\Documents\nallampatti_cluster.kml

CRS: EPSG:4326 - WGS 84

Datasource Options:
  ☑ NameField: name
  ☑ DescriptionField: description
```

**13.3: Export**
- Click **OK**

---

## **PART 8: UPLOAD TO SUPABASE STORAGE (BACKEND)**

### **Step 14: Upload KML to Supabase**

**14.1: Open Supabase Dashboard**
- Go to: https://supabase.com/dashboard/project/uvqcctheqvuilwfbpqcd
- Click **Storage** (left sidebar)

**14.2: Check if Bucket Exists**
- Look for bucket named: `kml-overlays`

**If bucket doesn't exist:**
1. Click **New bucket**
2. **Name:** `kml-overlays`
3. **Public bucket:** ☑ YES (IMPORTANT!)
4. Click **Create bucket**

**14.3: Upload KML File**
1. Click on `kml-overlays` bucket
2. Click **Upload file** button
3. Select: `C:\Users\dharani\Documents\nallampatti_cluster.kml`
4. Click **Upload**

**14.4: Verify Upload**
- You should see `nallampatti_cluster.kml` in the file list
- File should be **publicly accessible**

**14.5: Make File Public (if not already)**
1. Click the **3 dots** next to the file
2. Select **Make public** (if option appears)
3. Or verify bucket is public: **Settings** → **Public** should be ON

---

## **PART 9: TEST ON DASHBOARD**

### **Step 15: Refresh Dashboard**

**15.1: Open Dashboard**
- Go to: http://127.0.0.1:3000 (local testing)
- OR your Netlify URL (production)

**15.2: Check Console**
- Press **F12** (open Developer Tools)
- Click **Console** tab
- Look for:
```
✅ Loaded KML: Nallampatti Cluster (supabase)
```

**15.3: Verify Map**
- You should see:
  - ✅ Colored boundary polygons
  - ✅ Center point markers
  - ✅ Click polygon → Popup shows
  - ✅ Click marker → Popup shows

---

## **PART 10: REPEAT FOR OTHER VILLAGES**

### **For Poolampatti, Thumbalpatti, Karipatti, Mallamooppampatti:**

**Colors:**
- Poolampatti: Orange (#f97316)
- Thumbalpatti: Blue (#3b82f6)
- Karipatti: Purple (#a855f7)
- Mallamooppampatti: Yellow (#eab308)

**Coordinates:**
```
Poolampatti: 11.6000, 78.1500
Thumbalpatti: 11.5700, 78.2000
Karipatti: 11.5500, 78.1800
Mallamooppampatti: 11.6100, 78.1800
```

**Repeat Steps 4-13** for each village with different colors!

---

## **PART 9: COMBINE ALL KML FILES**

### **Option A: Merge in QGIS**

**Load all 5 KML files:**
1. **Layer** → **Add Layer** → **Add Vector Layer**
2. Select all 5 KML files
3. Click **Add**

**Merge them:**
1. **Vector** → **Data Management Tools** → **Merge Vector Layers**
2. Select all 5 KML layers
3. Export as: `nallampatti_cluster.kml`

### **Option B: Manual Merge (Easier)**

Just open each KML in text editor and copy all `<Placemark>` sections into one file.

---

## **🎯 FINAL RESULT**

You should have:
- ✅ 5 colored village boundaries (polygons)
- ✅ 5 center markers (points)
- ✅ One KML file: `nallampatti_cluster.kml`
- ✅ Ready to upload to dashboard!

---

## **📋 QUICK CHECKLIST**

- [ ] QGIS installed
- [ ] QuickMapServices plugin installed
- [ ] Google Satellite basemap loaded
- [ ] Lat Lon Tools plugin installed
- [ ] Navigated to Nallampatti (11.5833, 78.1667)
- [ ] Created polygon boundary layer
- [ ] Drew boundary following roads/fields
- [ ] Styled with green color (#22c55e)
- [ ] Created point marker layer
- [ ] Placed marker at village center
- [ ] Styled marker with green color
- [ ] Exported as KML
- [ ] File saved to: `frontend/nallampatti.kml`

---

## **🔧 TROUBLESHOOTING**

**Problem: Can't see satellite imagery**
- Solution: Web → QuickMapServices → Settings → Get contributed pack

**Problem: Can't find village**
- Solution: Use Google Earth first to find exact coordinates

**Problem: Polygon not closing**
- Solution: Right-click to finish (don't left-click on first point)

**Problem: Export to KML grayed out**
- Solution: Make sure layer CRS is EPSG:4326

**Problem: KML shows but no colors in dashboard**
- Solution: KML styling is not preserved, colors are assigned in code

---

## **🚀 READY TO START?**

Follow these steps one by one. Take your time on Step 7 (drawing boundary) - that's the most important part!
