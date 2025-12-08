# Salem District Taluks - QGIS Import Guide

## ✅ Quick Summary (What We Did)

1. ✅ Used **QuickOSM** plugin to download Salem administrative boundaries from OpenStreetMap
2. ✅ Filtered to show only **admin_level = 6** (taluks)
3. ✅ Manually selected **6 specific taluks** from attribute table
4. ✅ Exported selected taluks as **salem_taluk.shp**
5. ✅ Created **center markers** using Centroids tool
6. ✅ Exported **polygons** as `salem_taluks_polygons.kml`
7. ✅ Exported **points** as `salem_taluks_points.kml`
8. ✅ **Merged** both KML files into `salem_cluster.kml`

**Result:** Dashboard-compatible KML file with taluk boundaries AND center markers!
**Note:** Dashboard automatically assigns colors - no styling needed in QGIS!
**File name:** `salem_cluster.kml` (for consistency with naming convention)

---

## 📍 Taluks Included

| Taluk | Tamil Name | Approximate Center Coordinates |
|-------|-----------|-------------------------------|
| Mettur | மேட்டூர் | 77.8015, 11.7879 |
| Omalur | ஓமலூர் | 78.0397, 11.7433 |
| Edappadi | இடப்பாடி | 77.9833, 11.9333 |
| Sankari | சங்கரி | 77.8833, 11.4667 |
| Yercaud | ஏற்காடு | 78.2044, 11.7756 |

---

## 🎨 Dashboard Styling

**No manual styling needed!** The dashboard automatically assigns colors to taluks based on your location data and the `colorscale.js` configuration. Any QGIS styling will be ignored when the KML is loaded into MapLibre GL.

---

## 📥 Download Taluk Boundaries Data

### **Option 1: DataMeet India Maps (BEST!)**

**Download Link:** http://projects.datameet.org/maps/

**Steps:**
1. Go to: http://projects.datameet.org/maps/
2. Click **"Districts"** section
3. Download **"Tamil Nadu"** shapefile
4. Extract the ZIP file
5. You'll get: `TamilNadu_taluks.shp` (or similar name)

**Includes:**
- All Tamil Nadu taluks with boundaries
- Proper names in English
- Accurate geometry

---

### **Option 2: Use QGIS OpenStreetMap Plugin**

**If DataMeet link doesn't work:**

1. **In QGIS:**
   - **Plugins** → **Manage and Install Plugins**
   - Search: **QuickOSM**
   - Click **Install**

2. **Query OpenStreetMap:**
   - **Vector** → **QuickOSM** → **QuickOSM**
   - **Key**: `boundary`
   - **Value**: `administrative`
   - **In**: `Salem, Tamil Nadu, India`
   - Click **Run query**

3. **Filter Results:**
   - Look for admin_level = 5 or 6 (taluk level)
   - Filter to show only your 5 taluks

---

## 🗺️ Step-by-Step QGIS Process (ACTUAL PROCEDURE USED)

### **Step 1: Load Taluk Data from OpenStreetMap**

1. Open QGIS Desktop
2. **Plugins** → **Manage and Install Plugins**
3. Search: **QuickOSM** → Install
4. **Vector** → **QuickOSM** → **QuickOSM**

5. **Query Settings:**
   ```
   Key: boundary
   Value: administrative
   In: Salem, Tamil Nadu, India
   ```

6. Click **Run query**
7. Wait for download (10-30 seconds)
8. Multiple layers appear - use **boundary_multipolygons**

### **Step 2: Filter to Show Only Taluks (admin_level = 6)**

1. **Right-click** on **boundary_multipolygons** layer → **Filter...**
2. In **Query Builder**, enter:
   ```sql
   "admin_level" = 6
   ```
3. Click **Test** - should show ~11 taluks
4. Click **OK**

### **Step 3: Select Your Specific Taluks**

1. **Right-click** layer → **Open Attribute Table**
2. Scroll through and find your taluks in the **"name"** column
3. **Click on row numbers** (far left) to select:
   - Hold **Ctrl** key while clicking to select multiple
   - Select your 5-6 taluks
4. Top should show: **"Selected: 5"** (or 6)

### **Step 4: Export Selected Taluks**

1. **Right-click** layer → **Export** → **Save Selected Features As...**
2. **Settings:**
   ```
   Format: ESRI Shapefile
   File name: C:\Users\dharani\Documents\salem_taluk.shp
   CRS: EPSG:4326 - WGS 84
   ☑ Save only selected features
   ```
3. Click **OK**
4. New **salem_taluk** layer appears with only your taluks ✅

### **Step 3: Add Name/Description Fields** (if missing)

1. **Right-click** layer → **Open Attribute Table**
2. Check if you have fields: `name`, `description`

**If missing:**
1. **Toggle Editing** (Ctrl+E)
2. **Open Field Calculator**
3. **Create new field:**
   - **Output field name**: `description`
   - **Output field type**: Text (string)
   - **Field length**: 100
   - **Expression**:
     ```
     CASE 
       WHEN "name" = 'Mettur' THEN 'மேட்டூர்'
       WHEN "name" = 'Omalur' THEN 'ஓமலூர்'
       WHEN "name" = 'Edappadi' THEN 'இடப்பாடி'
       WHEN "name" = 'Sankari' THEN 'சங்கரி'
       WHEN "name" = 'Yercaud' THEN 'ஏற்காடு'
     END
     ```
4. Click **OK**
5. **Save edits** → **Stop editing**

### **Step 4: Create Center Markers (Centroids)**

1. **Vector** → **Geometry Tools** → **Centroids**

2. **Settings:**
   ```
   Input layer: salem_taluk
   Centroids: [Create temporary layer]
   ```

3. Click **Run** → Click **Close**

4. **Result:** New **Centroids** layer with point markers at center of each taluk! ✅

> **💡 Note:** No need to style colors in QGIS - the dashboard automatically assigns colors based on your data!

### **Step 5: Export Polygons as KML**

**Export the Taluk Boundaries:**

1. **Right-click** on **salem_taluk** layer → **Export** → **Save Features As...**

2. **Settings:**
   ```
   Format: Keyhole Markup Language [KML]
   
   File name: C:\Users\dharani\Documents\salem_taluks_polygons.kml
   
   CRS: EPSG:4326 - WGS 84
   
   Datasource Options:
     ☑ NameField: name
     ☑ DescriptionField: name
   
   Geometry: Automatic
   ```

3. Click **OK**

4. ✅ **Polygons KML created:** `salem_taluks_polygons.kml`

### **Step 6: Export Points as KML**

**Export the Center Markers:**

1. **Right-click** on **Centroids** layer → **Export** → **Save Features As...**

2. **Settings:**
   ```
   Format: Keyhole Markup Language [KML]
   
   File name: C:\Users\dharani\Documents\salem_taluks_points.kml
   
   CRS: EPSG:4326 - WGS 84
   
   Datasource Options:
     ☑ NameField: name
     ☑ DescriptionField: name
   
   Geometry: Automatic
   ```

3. Click **OK**

4. ✅ **Points KML created:** `salem_taluks_points.kml`

### **Step 7: Merge Both KML Files**

**Combine polygons and points into one file:**

1. **Open `salem_taluks_polygons.kml`** in a text editor (Notepad, VS Code, etc.)

2. **Scroll to the bottom** and find the line:
   ```xml
   </Folder>
   </Document></kml>
   ```

3. **Open `salem_taluks_points.kml`** and find the 6 point `<Placemark>` blocks starting with:
   ```xml
   <Placemark id="centroids.1">
   	<name>Salem South</name>
   ```
   
4. **Copy ALL 6 point placemarks** (from `<Placemark id="centroids.1">` to the closing `</Placemark>` of the 6th point - Mettur)

5. **Paste them into the polygons file** - right BEFORE the `</Folder>` line (after the last polygon placemark)

6. **Save as:** `salem_cluster.kml` (in Documents folder)

7. ✅ **Final merged KML created with 6 polygons + 6 points!**

**Result:** One KML file with:
- 6 colored taluk boundary polygons
- 6 circle markers at taluk centers
- Ready to upload to Supabase!

**⚠️ IMPORTANT for Dashboard:**
- Taluk names in KML will be converted to lowercase
- Example: "Mettur" → "mettur" (used for matching in database)
- If you create database entries later, use lowercase IDs

---

## ☁️ Upload to Dashboard

### **Step 1: Upload to Supabase Storage**

1. Go to: https://supabase.com/dashboard/project/uvqcctheqvuilwfbpqcd
2. Click **Storage** (left sidebar)
3. Click **kml-overlays** bucket
4. Click **Upload file**
5. Select: `salem_taluks.kml`
6. Click **Upload**
7. ✅ File uploaded!

### **Step 2: Verify Config Updated**

The config file has already been updated to include:

```javascript
{
    name: 'Salem Taluks',
    source: 'supabase',
    file: 'salem_taluks.kml',
    enabled: true,
    description: 'Mettur, Omalur, Edappadi, Sankari, Yercaud taluks'
}
```

### **Step 3: Test on Dashboard**

1. Open dashboard: http://localhost:5000
2. Wait for map to load
3. You should see:
   - ✅ 5 colored taluk boundaries
   - ✅ 5 center point markers
   - ✅ Taluks listed in left panel

4. **Toggle visibility:**
   - Uncheck "Salem Taluks" → Boundaries disappear
   - Check again → Boundaries reappear

---

## 🔧 Troubleshooting

### Problem: "name" field not found in Query Builder

**Solution:** Check your attribute table for the actual field name.

Common variations:
- `NAME` (uppercase)
- `TALUK`
- `taluk_name`
- `Taluk_Nam`

Use that in your query instead:
```sql
"TALUK" IN ('Mettur', 'Omalur', 'Edappadi', 'Sankari', 'Yercaud')
```

---

### Problem: Taluks don't show up on map

**Check 1: Coordinates**
- Taluk boundaries should be in Salem district
- Lat range: ~11.4° to 12.0°
- Lon range: ~77.8° to 78.5°

**Check 2: CRS**
- Must be EPSG:4326 (WGS 84)
- In QGIS, check bottom-right corner

**Check 3: KML File Size**
- Should be < 5 MB
- If larger, simplify polygons:
  - **Vector** → **Geometry Tools** → **Simplify**
  - Tolerance: 0.001

---

### Problem: Colors don't show in dashboard

**Solution:** Dashboard applies its own colors based on sensor data.

KML colors are for reference only. The colorscale system will override them when you click "Apply Color Scale".

---

### Problem: Markers not at exact center

**Solution:** Use **Polygon Centroids** tool instead of manual placement.

This calculates the geometric center automatically.

---

## 📊 Expected KML Structure

Your final KML should look like:

```xml
<?xml version="1.0" encoding="utf-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <Folder>
    <name>taluks</name>
    
    <!-- Mettur Polygon -->
    <Placemark>
      <name>Mettur</name>
      <description>மேட்டூர்</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>77.8,11.8 77.9,11.8 ... 77.8,11.8</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    
    <!-- More taluks... -->
    
    <!-- Mettur Marker -->
    <Placemark>
      <name>Mettur</name>
      <description>மேட்டூர்</description>
      <Point>
        <coordinates>77.8015,11.7879,0</coordinates>
      </Point>
    </Placemark>
    
    <!-- More markers... -->
    
  </Folder>
</Document>
</kml>
```

---

## ✅ Final Checklist

Before uploading to dashboard:

- [ ] 5 taluk boundaries drawn/imported
- [ ] Each taluk has unique color
- [ ] Center markers created (5 points)
- [ ] Markers styled with matching colors
- [ ] Layers merged (polygons + points)
- [ ] Exported as KML with EPSG:4326
- [ ] File saved as `salem_taluks.kml`
- [ ] File size < 5 MB
- [ ] Uploaded to Supabase Storage
- [ ] Config updated (already done!)
- [ ] Tested on local dashboard

---

## 🎯 Summary

**What you're creating:**
- 5 taluk administrative boundaries
- Colored polygons (25% transparent)
- Center point markers
- Single KML file for easy management

**Why it's useful:**
- Shows administrative divisions
- Helps locate villages within taluks
- Provides context for water monitoring locations
- Professional administrative overlay

**Time required:** ~20-30 minutes

---

**🚀 Ready to start? Begin with Step 1 - Download the boundary data!**

**Need help?** Check the troubleshooting section or refer back to the village boundaries guide for similar processes.
