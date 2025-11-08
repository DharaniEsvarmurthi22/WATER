# KML Database Manager - User Guide

## Overview
Your dashboard now has **TWO ways** to work with KML files, as requested by your sir:

---

## ✅ FEATURE 1: KML Library (Database Files)

### What It Does:
- Shows **all KML files stored in Supabase Storage**
- Files are **permanent** (persist even after refresh)
- Similar to overlays system
- Users can **toggle visibility** on/off for each file

### How It Works:

#### For Users:
1. **View Available KML Files**
   - Open dashboard
   - Look at left panel → "KML Library" section
   - All files from Supabase Storage are listed automatically

2. **Load/Unload KML Files**
   - ✅ **Check the box** → KML loads on map
   - ❌ **Uncheck the box** → KML removes from map
   - Changes apply instantly

3. **Delete Files**
   - Click 🗑️ trash icon next to any file
   - Confirm deletion
   - File removed from database permanently

4. **Refresh List**
   - Click 🔄 refresh icon at top of library
   - Reloads list from database

---

## ✅ FEATURE 2: Upload Custom KML

### Two Upload Options:

#### Option A: **Upload to Database (Permanent)** ⭐ RECOMMENDED
- **Location**: Left panel → "Upload Custom KML" → First upload box
- **What Happens**:
  1. User selects KML/GeoJSON file
  2. File uploads to **Supabase Storage** automatically
  3. File appears in KML Library list
  4. File loads on map immediately
  5. File **persists** even after refresh
  6. Other users can see it too (if they have access)

- **Use Case**: 
  - Production village boundaries
  - Official data that should be permanent
  - Shared overlays for all users

#### Option B: **Temporary View (Session Only)**
- **Location**: Left panel → "Upload Custom KML" → Second upload box (gray)
- **What Happens**:
  1. User selects KML/GeoJSON file(s)
  2. File loads on map **temporarily**
  3. File only exists in browser memory
  4. **Disappears on page refresh**
  5. Not saved to database

- **Use Case**:
  - Testing boundaries before final upload
  - Quick visualization
  - Personal/temporary analysis
  - Draft KML files

---

## 📋 Current Workflow

### Before (Old System):
```
❌ Upload KML → Shows on map → Refresh page → Gone!
❌ No way to see what files are in database
❌ No way to toggle KML visibility
❌ Everything temporary
```

### After (New System):
```
✅ KML Library shows all database files
✅ Toggle each file on/off with checkbox
✅ Upload to database (permanent)
✅ Upload temporary (for testing)
✅ Delete files from database
✅ Auto-loads configured KML files
```

---

## 🔧 Technical Details

### Database Structure:
- **Storage Bucket**: `kml-overlays` (Supabase Storage)
- **Access**: PUBLIC (anyone can view)
- **File Types Supported**: `.kml`, `.geojson`, `.json`

### Auto-Load Behavior:
1. **On Dashboard Open**:
   - Configured files in `overlays-config.js` auto-load ✅
   - KML Library list populates from database ✅

2. **After Upload**:
   - File saves to Supabase Storage ✅
   - KML Library list refreshes ✅
   - File auto-loads on map ✅

---

## 📝 Code Changes Summary

### 1. `index.html` Changes:
```html
<!-- NEW: KML Library Manager -->
<div class="p-4 border-b border-gray-200">
    <h3>KML Library</h3>
    <button id="refreshKmlList">🔄</button>
    <div id="kmlLibraryList">
        <!-- Files from database listed here -->
    </div>
</div>

<!-- UPDATED: Upload Section -->
<div class="p-4 border-b border-gray-200">
    <h3>Upload Custom KML</h3>
    
    <!-- Option A: Permanent -->
    <input type="file" id="fileUpload" accept=".kml,.geojson,.json">
    <p>Files will be saved to Supabase Storage</p>
    
    <!-- Option B: Temporary -->
    <input type="file" id="tempFileUpload" accept=".kml,.geojson,.json" multiple>
    <p>Temporary - removed on refresh</p>
</div>
```

### 2. `map.js` New Functions:

#### `loadKMLLibrary()`
- Lists all files from Supabase Storage bucket
- Filters KML/GeoJSON files
- Builds checkbox list with toggle functionality
- Shows file icons and names
- Adds delete buttons

#### `loadKMLFromDatabase(fileName)`
- Fetches file from Supabase Storage
- Parses KML/GeoJSON
- Loads on map
- Shows success message

#### `uploadKMLToDatabase(file)`
- Validates file type (KML, GeoJSON, JSON)
- Uploads to Supabase Storage
- Refreshes library list
- Auto-loads on map
- Supports file replacement (upsert)

#### `deleteKMLFromDatabase(fileName)`
- Removes layer from map
- Deletes file from Supabase Storage
- Refreshes library list
- Shows confirmation dialog

#### `isKMLLoaded(fileName)`
- Checks if KML file is currently on map
- Returns true/false
- Used to set checkbox state

#### `removeKMLLayer(fileName)`
- Removes all layers associated with file
- Removes sources from map
- Updates internal layer tracking

### 3. Event Listeners Updated:
```javascript
// Permanent upload
document.getElementById('fileUpload').addEventListener('change', 
    async (e) => await uploadKMLToDatabase(e.target.files[0])
);

// Temporary upload (unchanged behavior)
document.getElementById('tempFileUpload').addEventListener('change', 
    async (e) => loadFilesTemporarily(e.target.files)
);

// Refresh library
document.getElementById('refreshKmlList').addEventListener('click', 
    () => loadKMLLibrary()
);
```

---

## 🎯 What Your Sir Wanted:

### Requirement 1: ✅ DONE
> "It has to show option to import kml from database"
- **Solution**: KML Library panel shows all files from Supabase Storage
- **Location**: Left panel, above upload section

### Requirement 2: ✅ DONE
> "Similar to overlays"
- **Solution**: Checkbox toggles like overlay layers
- **Features**: On/off visibility, auto-load, persistent storage

### Requirement 3: ✅ DONE
> "Let the current option be there in case users want to upload their own kml"
- **Solution**: Two upload options:
  - Permanent (saves to database)
  - Temporary (session only)

### Requirement 4: ✅ DONE
> "Option to load automatically"
- **Solution**: 
  - Files in `overlays-config.js` auto-load on startup
  - KML Library shows all available files
  - Upload auto-loads new files

---

## 🚀 Testing Checklist

### Test 1: View KML Library
1. Open dashboard
2. Check left panel → "KML Library"
3. Should see: "Nallampatti Cluster" with checkbox

### Test 2: Toggle KML Visibility
1. ✅ Check "Nallampatti Cluster" → Boundaries appear
2. ❌ Uncheck → Boundaries disappear
3. ✅ Check again → Boundaries reappear

### Test 3: Upload Permanent KML
1. Create/get a test KML file
2. Click "Upload to Database" → Select file
3. File uploads → Appears in library
4. Map shows new KML
5. Refresh page → File still there ✅

### Test 4: Upload Temporary KML
1. Click "Temporary View" → Select file
2. Map shows KML
3. Refresh page → File gone ✅

### Test 5: Delete KML
1. In KML Library, click 🗑️ trash icon
2. Confirm deletion
3. File removed from list
4. Boundaries disappear from map

### Test 6: Refresh Library
1. Upload file via Supabase Dashboard
2. Click 🔄 refresh in KML Library
3. New file appears in list

---

## 🔐 Permissions

### Required Supabase Policies:
```sql
-- Allow anyone to read files from kml-overlays bucket
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'kml-overlays');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'kml-overlays' AND 
    auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'kml-overlays' AND 
    auth.role() = 'authenticated'
);
```

---

## 📌 Important Notes

1. **File Naming**: Use descriptive names (e.g., `nallampatti_cluster.kml`)
2. **File Size**: Keep KML files under 5MB for best performance
3. **Overwrites**: Uploading same filename replaces existing file
4. **Permissions**: Only authenticated users can upload/delete
5. **Visibility**: All uploaded files visible to all users
6. **Caching**: Files cached for 1 hour (3600 seconds)

---

## 🐛 Troubleshooting

### Issue: "Supabase client not available"
**Solution**: Check `data.js` exports `getSupabaseClient()` globally

### Issue: KML Library shows "Loading..."
**Solutions**:
1. Check Supabase URL in `env-config.js`
2. Check storage bucket name is `kml-overlays`
3. Check browser console for errors
4. Verify bucket exists and is PUBLIC

### Issue: Upload fails
**Solutions**:
1. Check file type (.kml, .geojson, .json only)
2. Check user is authenticated
3. Check storage policies in Supabase
4. Check file size < 50MB (Supabase limit)

### Issue: Delete doesn't work
**Solutions**:
1. Check user is authenticated
2. Check delete policy in Supabase
3. Check browser console for errors

---

## 📞 Summary for Your Sir

**Question**: What did we implement?

**Answer**:
1. ✅ **KML Library Panel** - Shows all KML files from database with toggle checkboxes
2. ✅ **Auto-load System** - Files load automatically like overlays
3. ✅ **Permanent Upload** - Save KML to database (persists forever)
4. ✅ **Temporary Upload** - Load KML for current session only
5. ✅ **Delete Functionality** - Remove files from database
6. ✅ **Refresh Button** - Reload library from database

**Result**: Users can now manage KML files from database while keeping the option to upload temporary files for testing!
