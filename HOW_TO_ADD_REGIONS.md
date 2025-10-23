# 🗺️ How to Add New Village Clusters / Regions

## Quick Guide: Adding Your Own KML/GeoJSON Overlays

### Step 1: Create Your KML/GeoJSON File

**Option A: Use QGIS (Recommended by your sir)**
1. Download QGIS: https://qgis.org/download/
2. Create new project
3. Add base map (OpenStreetMap)
4. Add your data:
   - Points: Village locations, sensor positions
   - Polygons: Water bodies, village boundaries, cluster areas
   - Lines: Rivers, roads, pipelines
5. Export: `Layer → Save As → KML` or `GeoJSON`
6. Save file in `frontend/` folder

**Option B: Copy & Modify Existing KML**
1. Open `nallampatti_cluster.kml` in text editor
2. Copy the structure
3. Change coordinates and names
4. Save with new filename

**Option C: Use Online Tools**
- Google My Maps: https://www.google.com/maps/d/
- geojson.io: https://geojson.io/

---

### Step 2: Add File to Project

1. **Save your KML/GeoJSON** in: `frontend/your-region-name.kml`

2. **Open**: `frontend/overlays-config.js`

3. **Add entry** to the `overlays` array:

```javascript
const OVERLAY_CONFIG = {
    autoLoad: true,
    
    overlays: [
        {
            name: 'Nallampatti Cluster',
            file: 'nallampatti_cluster.kml',
            enabled: true,
            description: '7 villages in Salem district'
        },
        // ADD YOUR NEW REGION HERE:
        {
            name: 'Your Region Name',           // Display name
            file: 'your-region-name.kml',       // Filename in frontend/
            enabled: true,                       // true = auto-load, false = manual only
            description: 'Brief description'    // What this overlay shows
        }
    ]
};
```

4. **Save the file**

5. **Done!** ✅ Your overlay will load automatically on dashboard

---

### Step 3: Add Locations to Database (Optional)

If you want to add actual monitoring locations (not just map overlays):

1. **Open**: Supabase SQL Editor
2. **Copy template** from `add_nallampatti_villages.sql`
3. **Modify** with your village names and coordinates
4. **Run** the SQL

---

## 📝 Examples

### Example 1: Add Coimbatore Region

**File**: `frontend/coimbatore_region.kml` (create this)

**Config**: `frontend/overlays-config.js`
```javascript
{
    name: 'Coimbatore Water Bodies',
    file: 'coimbatore_region.kml',
    enabled: true,
    description: 'Lakes and ponds in Coimbatore district'
}
```

### Example 2: Add Multiple Regions

```javascript
const OVERLAY_CONFIG = {
    autoLoad: true,
    
    overlays: [
        // Salem Region
        {
            name: 'Nallampatti Cluster',
            file: 'nallampatti_cluster.kml',
            enabled: true,
            description: '7 villages in Salem'
        },
        
        // Coimbatore Region
        {
            name: 'Coimbatore Lakes',
            file: 'coimbatore_lakes.kml',
            enabled: true,
            description: '10 lakes in Coimbatore'
        },
        
        // Chennai Region
        {
            name: 'Chennai Water Bodies',
            file: 'chennai_water.geojson',  // GeoJSON also works!
            enabled: true,
            description: 'Chennai metropolitan water sources'
        },
        
        // Administrative Boundaries (disabled by default)
        {
            name: 'District Boundaries',
            file: 'district_boundaries.kml',
            enabled: false,  // Won't auto-load, can be enabled in UI
            description: 'Tamil Nadu district administrative boundaries'
        }
    ]
};
```

---

## 🎨 KML Styling Tips

### Colors in KML

```xml
<Style id="waterBodyStyle">
  <LineStyle>
    <color>ff0000ff</color>  <!-- Red line (AABBGGRR format) -->
    <width>3</width>
  </LineStyle>
  <PolyStyle>
    <color>4d0000ff</color>  <!-- Semi-transparent red fill -->
  </PolyStyle>
</Style>
```

**Color Format**: `AABBGGRR` (Alpha, Blue, Green, Red)
- `ff` = Fully opaque
- `00` = Fully transparent
- `ff0000ff` = Red
- `ff00ff00` = Green
- `ffff0000` = Blue

### Tamil Text Support

KML fully supports Unicode Tamil text:

```xml
<Placemark>
  <name>நல்லம்பட்டி</name>
  <description>தண்ணீர் தரம் கண்காணிப்பு</description>
</Placemark>
```

---

## 🔧 Enable/Disable Overlays

### Method 1: In Config File (Permanent)

```javascript
{
    name: 'My Overlay',
    file: 'my-overlay.kml',
    enabled: false,  // Change to true to auto-load
    description: 'Description'
}
```

### Method 2: In Dashboard (Temporary)

1. Open dashboard
2. Toggle "Custom Overlays" checkbox
3. All overlays show/hide together

---

## 📊 Coordinate Format

**KML uses**: Longitude, Latitude, Altitude

```xml
<coordinates>
    78.1667,11.5833,0
    ^^^lng  ^^^lat  ^altitude (usually 0)
</coordinates>
```

**Finding Coordinates**:
1. Google Maps: Right-click → "What's here?"
2. Shows: `11.5833, 78.1667` (Latitude, Longitude)
3. **Reverse for KML**: `78.1667,11.5833,0`

---

## 🚀 Quick Start Templates

### Template 1: Single Village Point

```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>My Village</name>
    
    <Placemark>
      <name>Village Name</name>
      <description>Water monitoring station</description>
      <Point>
        <coordinates>LONGITUDE,LATITUDE,0</coordinates>
      </Point>
    </Placemark>
    
  </Document>
</kml>
```

### Template 2: Water Body Polygon

```xml
<Placemark>
  <name>Village Pond</name>
  <Polygon>
    <outerBoundaryIs>
      <LinearRing>
        <coordinates>
          78.1650,11.5850,0
          78.1680,11.5850,0
          78.1680,11.5820,0
          78.1650,11.5820,0
          78.1650,11.5850,0  <!-- Close the polygon -->
        </coordinates>
      </LinearRing>
    </outerBoundaryIs>
  </Polygon>
</Placemark>
```

---

## ✅ Deployment Checklist

After adding new overlays:

1. ✅ KML/GeoJSON file saved in `frontend/` folder
2. ✅ Added entry to `overlays-config.js`
3. ✅ Set `enabled: true` for auto-load
4. ✅ Test locally: `node frontend/server.js`
5. ✅ Push to GitHub: `git add . && git commit -m "Added new region" && git push`
6. ✅ Netlify auto-deploys (wait 2 minutes)
7. ✅ Verify on live dashboard

---

## 🎯 Use Cases

### Agricultural Monitoring
- Add village clusters
- Mark irrigation channels
- Show crop areas

### Urban Water Management
- City water supply lines
- Treatment plants
- Distribution zones

### Environmental Study
- River basins
- Watershed boundaries
- Ecological zones

### Government Planning
- District boundaries
- Panchayat areas
- Census regions

---

## 💡 Pro Tips

1. **Keep files small**: Large KML files slow down map
2. **Use meaningful names**: Easy to identify in config
3. **Test before deploying**: Use local server first
4. **Backup original files**: Before editing KML
5. **Use QGIS for complex overlays**: Professional results
6. **Document your coordinates**: Keep notes of source data

---

## 📞 Troubleshooting

### Overlay not showing?
- Check filename matches in `overlays-config.js`
- Verify file is in `frontend/` folder
- Check browser console (F12) for errors
- Make sure `enabled: true`
- Toggle "Custom Overlays" checkbox

### Wrong location on map?
- Verify coordinates are in correct order (lng, lat)
- Check coordinate system (should be WGS84)
- Ensure decimal degrees (not DMS format)

### KML not loading?
- Validate XML syntax: https://www.xmlvalidation.com/
- Check for unclosed tags
- Verify UTF-8 encoding for Tamil text

---

## 🌟 That's It!

You now have a **fully customizable overlay system**. Just:
1. Create your KML/GeoJSON
2. Add one entry to `overlays-config.js`
3. Push to GitHub

**No complex code changes needed!** 🎉
