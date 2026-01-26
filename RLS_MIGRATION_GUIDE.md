# RLS SYSTEM MIGRATION GUIDE

## Overview
You're migrating from **device-specific tables** to a **centralized RLS system**:
- ❌ **Old System**: device_ESP32_01_readings, device_ESP32_02_readings, etc.
- ✅ **New System**: One `sensor_readings` table + `device_assignments` "key" table + RLS

## Benefits of New System
✅ **Scalability**: Add 1000 devices = Add 1000 rows (not 1000 tables)  
✅ **Security**: Database enforces access (can't be bypassed)  
✅ **Performance**: Better indexing, optimized queries  
✅ **Simplicity**: One table to backup, query, and maintain  
✅ **Fast Updates**: Change device assignment = Update 1 row (not drop/create tables)

---

## Step 1: Deploy Database Changes

### 1.1 Run the RLS Setup Script
```sql
-- In Supabase SQL Editor, run:
-- File: SETUP_RLS_SYSTEM.sql
```

This creates:
- `device_assignments` table (the "key" directory)
- Updated `sensor_readings` table (centralized storage)
- RLS policies (the "security guard")
- Helper functions for device management

### 1.2 Verify Tables Created
```sql
-- Check device_assignments exists
SELECT * FROM device_assignments LIMIT 1;

-- Check sensor_readings exists with RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'sensor_readings';
-- Should show rowsecurity = true

-- Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename IN ('sensor_readings', 'device_assignments');
```

---

## Step 2: Migrate Existing Data

### 2.1 Migrate Device Assignments from KML Overlays
If you've been using `kml_overlays.linked_device_id` to assign devices:

```sql
INSERT INTO device_assignments (user_id, device_id, device_name, notes)
SELECT DISTINCT
    owner_user_id,
    linked_device_id,
    'Migrated from KML: ' || file_name,
    'Auto-migrated from kml_overlays on ' || NOW()
FROM kml_overlays
WHERE linked_device_id IS NOT NULL
  AND owner_user_id IS NOT NULL
ON CONFLICT (device_id) DO NOTHING;

-- Check what was migrated
SELECT * FROM device_assignments ORDER BY assigned_at DESC;
```

### 2.2 Migrate Historical Data (Optional)
If you have historical data in device-specific tables:

```sql
-- Example: Migrate from device_ESP32_SALEM_01_readings
INSERT INTO sensor_readings (
    device_id, device_name, latitude, longitude,
    water_level, flow_rate, ph, turbidity, temperature, tds,
    status, timestamp, created_at
)
SELECT 
    'ESP32_SALEM_01' as device_id,
    device_name, latitude, longitude,
    water_level, flow_rate, ph, turbidity, temperature, tds,
    status, timestamp, created_at
FROM device_ESP32_SALEM_01_readings
ORDER BY timestamp DESC
LIMIT 10000; -- Adjust limit as needed

-- Repeat for each device table...
-- Or write a script to iterate through all device tables
```

---

## Step 3: Update ESP32 Code

Ensure all ESP32 devices are sending data to `sensor_readings` (not device-specific tables):

```cpp
// ESP32 code update
String jsonPayload = "{\"device_id\":\"ESP32_SALEM_01\",";
jsonPayload += "\"device_name\":\"Salem Taluk Monitor\",";
jsonPayload += "\"latitude\":" + String(DEVICE_LATITUDE, 6) + ",";
jsonPayload += "\"longitude\":" + String(DEVICE_LONGITUDE, 6) + ",";
jsonPayload += "\"water_level\":" + String(waterLevel, 2) + ",";
// ... other sensors
jsonPayload += "\"timestamp\":\"" + timeString + "\"}";

// POST to /rest/v1/sensor_readings (not device-specific table)
http.begin(client, supabaseUrl + "/rest/v1/sensor_readings");
```

**Critical**: Make sure `device_id` field is included in every reading!

---

## Step 4: Update Frontend

The frontend has been updated in [data.js](frontend/data.js):

### Changes Made:
1. **getUserLinkedDevices()**: Now queries `device_assignments` instead of `kml_overlays`
2. **fetchSensorData()**: Queries `sensor_readings` (RLS auto-filters)
3. **subscribeToRealtimeUpdates()**: Filters realtime by device_id

### No Action Required:
The code has already been updated. Just refresh your browser after deployment.

---

## Step 5: Test the System

### 5.1 Test as Admin User

```javascript
// 1. Log in as admin
// 2. Open browser console (F12)
// 3. Check logs

// You should see:
// 👑 Admin user detected - returning null to show all devices
// ✅ Got X readings from sensor_readings (filtered by RLS)
// 📍 Displaying X device(s) from sensor data
```

**Expected Result**: Admin sees ALL devices from ALL users.

### 5.2 Test as Regular User

```javascript
// 1. Log in as regular user
// 2. Open browser console (F12)
// 3. Check logs

// You should see:
// ✅ User assigned devices: ['ESP32_DEVICE_01', 'ESP32_DEVICE_02']
// ✅ Got X readings from sensor_readings (filtered by RLS)
// 📍 Displaying 2 device(s) from sensor data
```

**Expected Result**: User only sees their assigned devices.

### 5.3 Test Device Assignment

As admin, assign a device to a user:

```sql
-- Get user ID
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Assign device
SELECT assign_device_to_user(
    'user-uuid-here'::UUID,
    'ESP32_TEST_01',
    'Test Device',
    'Testing RLS system'
);

-- Verify assignment
SELECT * FROM device_assignments WHERE user_id = 'user-uuid-here';
```

Then have that user refresh their dashboard - they should now see the new device!

### 5.4 Test Realtime Updates

```sql
-- Simulate ESP32 sending data
INSERT INTO sensor_readings (
    device_id, device_name, latitude, longitude,
    water_level, ph, temperature, status
) VALUES (
    'ESP32_TEST_01', 'Test Device',
    11.1234, 77.5678,
    85.5, 7.2, 28.3, 'active'
);
```

**Expected Result**: 
- User who owns ESP32_TEST_01 sees live update
- Other users don't see anything (RLS blocks it)

### 5.5 Test RLS Security

Try to bypass RLS (this should FAIL):

```javascript
// In browser console as regular user
const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('device_id', 'SOMEONE_ELSES_DEVICE');

console.log(data); // Should be empty array
console.log(error); // Should be null (no error, just no data)
```

**Expected Result**: User cannot see other users' device data, even if they try.

---

## Step 6: Device Management Functions

### Assign a Device (Admin Only)
```sql
SELECT assign_device_to_user(
    'user-uuid'::UUID,
    'ESP32_DEVICE_ID',
    'Device Friendly Name',
    'Optional notes'
);
```

### Remove Device Assignment (Admin Only)
```sql
SELECT unassign_device('ESP32_DEVICE_ID');
```

### Get User's Devices
```sql
-- Get current user's devices
SELECT * FROM get_user_devices();

-- Get specific user's devices (admin only)
SELECT * FROM get_user_devices('user-uuid'::UUID);
```

### Bulk Assign Devices
```sql
-- Assign multiple devices at once
DO $$
DECLARE
    v_user_id UUID := 'user-uuid-here';
BEGIN
    PERFORM assign_device_to_user(v_user_id, 'ESP32_01', 'Device 1');
    PERFORM assign_device_to_user(v_user_id, 'ESP32_02', 'Device 2');
    PERFORM assign_device_to_user(v_user_id, 'ESP32_03', 'Device 3');
END $$;
```

---

## Step 7: Cleanup Old System (Optional)

⚠️ **WARNING**: Only do this after confirming new system works!

### 7.1 Identify Old Tables
```sql
-- List all device-specific tables
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'device_%_readings'
ORDER BY tablename;
```

### 7.2 Backup First!
```sql
-- Use Supabase dashboard to create a backup
-- Or export tables manually
```

### 7.3 Drop Old Tables
```sql
-- Drop one table
DROP TABLE IF EXISTS device_ESP32_SALEM_01_readings;

-- Or drop all device tables at once (CAREFUL!)
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename LIKE 'device_%_readings'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(tbl.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', tbl.tablename;
    END LOOP;
END $$;
```

### 7.4 Remove Old Functions (if any)
```sql
-- Drop device table creation functions
DROP FUNCTION IF EXISTS create_device_table CASCADE;
DROP FUNCTION IF EXISTS list_device_tables CASCADE;
```

---

## Troubleshooting

### User Sees No Data
```sql
-- Check if user has assigned devices
SELECT * FROM device_assignments WHERE user_id = 'user-uuid';

-- Check if readings exist for those devices
SELECT device_id, COUNT(*) as reading_count
FROM sensor_readings
WHERE device_id IN (
    SELECT device_id FROM device_assignments WHERE user_id = 'user-uuid'
)
GROUP BY device_id;
```

### Realtime Not Working
```javascript
// Check subscription in browser console
// Should see: ✅ Subscribed to real-time updates
// Should see: 📡 Listening for devices: [...]

// If not working:
// 1. Check Supabase Realtime is enabled
// 2. Check RLS policies allow SELECT for user
// 3. Check device_id filter in subscription
```

### RLS Blocking Everything
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'sensor_readings';

-- Temporarily disable RLS for testing (DON'T DO IN PRODUCTION!)
-- ALTER TABLE sensor_readings DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
-- ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
```

### ESP32 Can't Insert Data
```sql
-- Check anon insert policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'sensor_readings' 
  AND policyname LIKE '%ESP32%';

-- Verify ESP32 is using correct table name
-- Table should be: sensor_readings (not device_xxx_readings)
```

---

## Quick Reference SQL

### Check System Status
```sql
-- Count devices per user
SELECT 
    up.email,
    COUNT(da.device_id) as device_count,
    ARRAY_AGG(da.device_id) as devices
FROM device_assignments da
JOIN auth.users u ON da.user_id = u.id
LEFT JOIN user_profiles up ON u.id = up.user_id
GROUP BY up.email;

-- Count readings per device
SELECT 
    device_id,
    COUNT(*) as reading_count,
    MAX(timestamp) as latest_reading
FROM sensor_readings
GROUP BY device_id
ORDER BY latest_reading DESC;

-- Check RLS is working
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';
SELECT * FROM sensor_readings LIMIT 5;
-- Should only show user's device data
RESET ROLE;
```

---

## Files Created

1. **SETUP_RLS_SYSTEM.sql** - Main database setup script
2. **RLS_FRONTEND_UPDATE_GUIDE.sql** - Frontend code reference
3. **frontend/data.js** - Updated with RLS-aware queries
4. **RLS_MIGRATION_GUIDE.md** - This file

---

## Support

If you encounter issues:
1. Check browser console for error messages
2. Check Supabase logs
3. Verify RLS policies with SQL queries above
4. Test with simple INSERT/SELECT to isolate issue

**Remember**: RLS is enforced at the DATABASE level - it cannot be bypassed by frontend bugs!
