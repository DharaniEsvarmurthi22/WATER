# 🎯 Complete ESP32 Device Linking System

## Overview
This system implements **one-time device claiming with edit capability**, where:
- ✅ Users claim ESP32 devices once with ID and password
- ✅ Devices are user-specific and cannot be claimed by others
- ✅ Original owner can edit device details anytime
- ✅ Devices link to BOTH user AND KML boundaries
- ✅ Admins can reassign devices between users from backend

---

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Setup](#database-setup)
3. [Features](#features)
4. [User Workflow](#user-workflow)
5. [Admin Functions](#admin-functions)
6. [Testing](#testing)

---

## 🏗️ System Architecture

### Database Schema

```
devices table:
├── id (uuid, PK)
├── device_identifier (text, unique) → e.g., "ESP32-SALEM-001"
├── name (text) → Friendly name, editable
├── secret (text) → Password for claiming
├── user_id (uuid, FK → auth.users) → Owner
├── kml_overlay_id (uuid, FK → kml_overlays) → Linked KML
├── location_id (text) → Location reference, editable
├── claimed_at (timestamptz) → First claim timestamp
├── updated_at (timestamptz) → Last edit timestamp
└── metadata (jsonb) → Additional data

kml_overlays table:
├── id (uuid, PK)
├── owner_user_id (uuid, FK → auth.users)
├── device_identifier (text) → Linked device
├── linked_device_id (text) → Redundant link
├── name (text) → KML display name
├── file_name (text) → Original filename
├── storage_path (text) → Supabase storage path
└── ...

Relationship:
devices.user_id → auth.users.id (user ownership)
devices.kml_overlay_id → kml_overlays.id (device-KML link)
kml_overlays.owner_user_id → auth.users.id (KML ownership)
kml_overlays.device_identifier → devices.device_identifier (bidirectional)
```

---

## 🗄️ Database Setup

### Step 1: Run Device Linking SQL

Execute in **Supabase SQL Editor**:

```bash
sql/update_device_linking.sql
```

This creates:
- ✅ Enhanced `claim_device()` function (one-time claim, editable by owner)
- ✅ `update_device()` function (edit device name, location)
- ✅ `link_device_to_kml()` function (link device to KML boundary)
- ✅ `unlink_device_from_kml()` function (change KML later)
- ✅ `get_device_details()` function (fetch full device info)
- ✅ `admin_reassign_device()` function (admin: move device to another user)
- ✅ RLS policies (users only see/edit their own devices)

### Step 2: Run KML Overlay System

Execute in **Supabase SQL Editor**:

```bash
create_kml_overlays.sql
```

This creates:
- ✅ `kml_overlays` table with proper schema
- ✅ Storage bucket integration
- ✅ `upsert_device_kml()` function (upload/replace KML)
- ✅ Unique constraint (one KML per device per user)

### Step 3: Run Multiuser System

Execute in **Supabase SQL Editor**:

```bash
sql/setup_multiuser_system.sql
```

This sets up:
- ✅ User profiles table with roles (user/admin)
- ✅ Admin functions for user management
- ✅ Complete RLS policies

---

## ✨ Features

### 1. One-Time Device Claiming (Editable)

**How it works:**
- User enters device ID and password
- System checks if device is already claimed by someone else
- If unclaimed or owned by same user → success
- If owned by different user → error (contact admin)

**SQL Function:**
```sql
SELECT * FROM claim_device('ESP32-SALEM-001', 'device_password');
```

**Result:**
- Device is linked to user's account
- `claimed_at` timestamp is set (kept on re-claims)
- User can now edit device details

### 2. Edit Device Details

**Editable fields:**
- Device name (friendly display name)
- Location ID (e.g., "Nallampatti-Village-1")

**SQL Function:**
```sql
SELECT * FROM update_device(
    'ESP32-SALEM-001',
    'Salem District Water Sensor',
    'Nallampatti-Village-1'
);
```

**Frontend:**
- Click "Edit" button next to claimed device
- Popup dialog for editing name and location
- Changes saved immediately

### 3. Device-KML Linking

**Requirements:**
- User must own the device
- User must own the KML overlay
- Both device_identifier and owner_user_id must match

**SQL Function:**
```sql
SELECT * FROM link_device_to_kml(
    'ESP32-SALEM-001',
    'uuid-of-kml-overlay'
);
```

**Automatic Linking:**
When uploading KML via Upload KML page:
1. Select device from dropdown (shows only claimed devices)
2. Upload KML file
3. System automatically links device ↔ KML

### 4. Unlink/Change KML

**SQL Function:**
```sql
SELECT * FROM unlink_device_from_kml('ESP32-SALEM-001');
```

**Use case:**
- User wants to replace boundary file
- User uploaded wrong KML
- Device moved to different location

After unlinking, user can upload new KML.

---

## 👤 User Workflow

### Claiming a Device

1. **Login** to dashboard
2. **Sidebar → Device Connection**
   - Enter device ID (e.g., `ESP32-SALEM-001`)
   - Enter device password
   - Click "Connect"
3. **Success!** Device appears in claimed devices list

### Editing a Device

1. **View claimed devices** in sidebar
2. **Click "Edit" button** next to device
3. **Edit dialogs appear:**
   - Edit device name
   - Edit location ID
4. **Save changes** → device updated

### Uploading KML Boundary

1. **Go to "Upload KML" page**
2. **Select device** from dropdown (shows only your devices)
3. **Choose KML file** (village boundary, region, etc.)
4. **Upload** → KML is linked to device
5. **Dashboard map** now shows KML boundary with device data

### Viewing Data

- **Dashboard map** displays:
  - Sensor readings (markers)
  - KML boundaries (if linked)
  - Only data from claimed devices
- **Automatic filtering** by user ownership

---

## 👨‍💼 Admin Functions

### Reassign Device to Another User

**SQL Function:**
```sql
SELECT * FROM admin_reassign_device(
    'ESP32-SALEM-001',
    'uuid-of-new-user'
);
```

**Use case:**
- User accidentally claimed wrong device
- Device ownership needs to change
- Administrative corrections

**Requirements:**
- Caller must have `role = 'admin'` in `user_profiles`

### View All Devices

```sql
-- Admin view: all devices
SELECT 
    d.device_identifier,
    d.name,
    u.email as owner_email,
    d.claimed_at,
    k.name as kml_name
FROM devices d
LEFT JOIN auth.users u ON u.id = d.user_id
LEFT JOIN kml_overlays k ON k.id = d.kml_overlay_id
ORDER BY d.claimed_at DESC;
```

---

## 🧪 Testing

### Test 1: Claim Device

```javascript
// In browser console
const { data, error } = await supabase.rpc('claim_device', {
    p_device_identifier: 'ESP32-SALEM-001',
    p_secret: 'your_device_password'
});
console.log(data);
```

**Expected:** Device claimed, appears in claimed devices list

### Test 2: Edit Device

```javascript
const { data, error } = await supabase.rpc('update_device', {
    p_device_identifier: 'ESP32-SALEM-001',
    p_device_name: 'Salem Water Sensor',
    p_location_id: 'Nallampatti-1'
});
console.log(data);
```

**Expected:** Device name and location updated

### Test 3: Link to KML

1. Upload KML via Upload KML page
2. Select device "ESP32-SALEM-001"
3. Upload boundary file
4. Check database:

```sql
SELECT 
    d.device_identifier,
    d.kml_overlay_id,
    k.name as kml_name
FROM devices d
LEFT JOIN kml_overlays k ON k.id = d.kml_overlay_id
WHERE d.device_identifier = 'ESP32-SALEM-001';
```

**Expected:** `kml_overlay_id` is populated, KML appears on map

### Test 4: Re-Claim Protection

1. User A claims ESP32-SALEM-001
2. Sign out, sign in as User B
3. Try to claim ESP32-SALEM-001 with correct password

**Expected:** Error message: "Device already claimed by another user"

### Test 5: Edit by Same User

1. User A claims ESP32-SALEM-001
2. User A tries to claim again (re-enter credentials)

**Expected:** Success! Device re-claimed, `claimed_at` unchanged

---

## 📊 Database Queries

### Check Claimed Devices

```sql
-- All claimed devices
SELECT 
    device_identifier,
    name,
    user_id,
    claimed_at,
    kml_overlay_id IS NOT NULL as has_kml
FROM devices
WHERE user_id IS NOT NULL
ORDER BY claimed_at DESC;
```

### Unclaimed Devices

```sql
-- Devices available for claiming
SELECT device_identifier, name
FROM devices
WHERE user_id IS NULL;
```

### Devices with KML

```sql
-- Devices with linked KML boundaries
SELECT 
    d.device_identifier,
    d.name,
    k.name as kml_name,
    k.file_name
FROM devices d
JOIN kml_overlays k ON k.id = d.kml_overlay_id
WHERE d.user_id = 'your_user_id';
```

---

## 🔒 Security

### Row Level Security (RLS)

**devices table:**
- `SELECT`: Users see only their devices (or unclaimed)
- `UPDATE`: Users can only edit their own devices
- `INSERT`: N/A (devices pre-populated by admin)

**kml_overlays table:**
- `SELECT`: Users see only their own KML
- `INSERT/UPDATE/DELETE`: Users manage only their own KML
- Admins can view all (via separate policy)

### Function Security

All RPC functions use `SECURITY DEFINER`:
- Checks `auth.uid()` for user context
- Validates ownership before operations
- Prevents unauthorized access

---

## 📁 File Structure

```
WATER/
├── frontend/
│   ├── device_manager.js         ← Device claiming & editing logic
│   ├── upload_kml.js             ← KML upload & device linking
│   ├── map.js                    ← Map visualization
│   └── index.html                ← Main dashboard
├── sql/
│   ├── update_device_linking.sql ← Device linking system (NEW)
│   ├── setup_multiuser_system.sql← Multiuser & admin setup
│   └── claim_device.sql          ← Legacy claim function
├── create_kml_overlays.sql       ← KML system setup
└── COMPLETE_DEVICE_LINKING_GUIDE.md ← This file
```

---

## 🎉 Summary

### What Your System Does:

1. **Users claim ESP32 devices** with ID + password
2. **Devices are user-specific** (can't be claimed by others)
3. **Original owner can edit** device details anytime
4. **Devices link to KML boundaries** (village boundaries, regions)
5. **Dashboard shows only user's data** (filtered by ownership)
6. **Admins can reassign devices** from backend
7. **Complete security** with RLS policies

### Key Points:

- ✅ One-time claim, but editable by owner
- ✅ Device linked to both user AND KML
- ✅ Users manage their own devices
- ✅ Admins have override capability
- ✅ Automatic data filtering on dashboard
- ✅ Clean, professional UI

---

## 🆘 Troubleshooting

### Issue: Can't edit device

**Check:**
1. Are you logged in?
2. Do you own the device?
3. Is `update_device()` function installed?

```sql
-- Verify function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'update_device';
```

### Issue: Can't link KML to device

**Check:**
1. Do you own the device?
2. Do you own the KML?
3. Is `link_device_to_kml()` function installed?

```sql
-- Check device ownership
SELECT device_identifier, user_id
FROM devices
WHERE device_identifier = 'ESP32-SALEM-001';

-- Check KML ownership
SELECT name, owner_user_id
FROM kml_overlays
WHERE id = 'your-kml-uuid';
```

### Issue: Device claimed by another user

**Solution:**
Only admin can reassign:

```sql
-- As admin
SELECT * FROM admin_reassign_device(
    'ESP32-SALEM-001',
    'uuid-of-new-owner'
);
```

---

## 🚀 Next Steps

1. ✅ Run `sql/update_device_linking.sql` in Supabase
2. ✅ Test device claiming on frontend
3. ✅ Test device editing (click Edit button)
4. ✅ Upload KML boundaries for devices
5. ✅ Verify map shows device data + KML boundaries
6. ✅ Create admin account and test device reassignment

**Everything is ready to deploy!** 🎯
