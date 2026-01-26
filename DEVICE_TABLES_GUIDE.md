# Device-Specific Tables Implementation Guide

## 🎯 What Changed

### Before:
- ❌ One big `sensor_readings` table for ALL devices
- ❌ Filtering by `device_identifier` column
- ❌ Data mixed together

### After:
- ✅ Each device gets its own table: `device_ESP32_001_readings`, `device_ESP32_002_readings`
- ✅ Auto-created when ESP32 transmits first time
- ✅ Complete data isolation per device
- ✅ KML links to specific device table

## 📋 Implementation Steps

### Step 1: Run Database Setup

**Execute this SQL in Supabase SQL Editor:**

```bash
File: SETUP_DEVICE_SPECIFIC_TABLES.sql
```

This creates:
1. `insert_device_reading()` function - Auto-creates device tables
2. `get_device_table_name()` helper function
3. `list_device_tables()` - Lists all device tables
4. Updates `devices` table schema
5. Test insertion

### Step 2: Update ESP32 Code

**Use the new Arduino code:**

```bash
File: ESP32_DeviceSpecific_Tables.ino
```

Key changes:
- Calls Supabase RPC function `insert_device_reading`
- Sends device_id + device_password
- Backend auto-creates table `device_{deviceId}_readings`

**Configure in ESP32:**
```cpp
const char* deviceId = "ESP32_SALEM_001";  // UNIQUE per device
const char* devicePassword = "your_secret_password";
```

### Step 3: Frontend Updated (Already Done!)

**Modified files:**
- `frontend/data.js` - Now queries device-specific tables

## 🔄 How It Works

### ESP32 Transmission Flow:

```
ESP32 transmits:
  device_id: "ESP32_SALEM_001"
  device_password: "secret123"
  sensor_id: "ph_sensor"
  value: 7.2
    ↓
Supabase function: insert_device_reading()
    ↓
Check if table exists: device_ESP32_SALEM_001_readings
    ↓
NO? → Create table automatically
    ↓
Insert reading into device_ESP32_SALEM_001_readings
    ↓
Return: { success: true, table: "device_ESP32_SALEM_001_readings" }
```

### Frontend Data Flow:

```
User logs in → Get linked_device_id from kml_overlays
    ↓
linked_device_id = "ESP32_SALEM_001"
    ↓
Calculate table name: getDeviceTableName("ESP32_SALEM_001")
    ↓
Returns: "device_ESP32_SALEM_001_readings"
    ↓
Query: SELECT * FROM device_ESP32_SALEM_001_readings
    ↓
Display in Recent Readings, Map Popups, Location Dashboard
```

## 🗂️ Database Structure

### Device Table Naming:
```
Device ID: ESP32_SALEM_001
Table Name: device_ESP32_SALEM_001_readings

Device ID: ESP32-METTUR-002  
Table Name: device_ESP32_METTUR_002_readings  (special chars replaced with _)
```

### Table Schema (auto-created):
```sql
CREATE TABLE device_ESP32_SALEM_001_readings (
    id BIGSERIAL PRIMARY KEY,
    sensor_id TEXT NOT NULL,           -- "ph_sensor", "turbidity_sensor", etc.
    value NUMERIC NOT NULL,            -- Sensor reading value
    timestamp TIMESTAMPTZ DEFAULT NOW(), -- When reading was taken
    rssi INTEGER,                      -- WiFi signal strength
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_device_ESP32_SALEM_001_readings_timestamp ON device_ESP32_SALEM_001_readings(timestamp DESC);
CREATE INDEX idx_device_ESP32_SALEM_001_readings_sensor_id ON device_ESP32_SALEM_001_readings(sensor_id);
```

## 📍 Location Dropdown (Next Step)

To show only KML locations in the dropdown, we need to:
1. Parse KML polygons
2. Extract location names from polygon names
3. Filter dropdown options

**Will implement this next!**

## 🧪 Testing

### 1. Test Database Function:

```sql
-- Test auto-create table
SELECT public.insert_device_reading(
    'TEST_DEVICE_001',
    'test123',
    'ph_sensor',
    7.5,
    NOW(),
    -65
);

-- Verify table created
SELECT * FROM public.list_device_tables();

-- Query test data
SELECT * FROM device_TEST_DEVICE_001_readings;
```

### 2. Test ESP32:

1. Upload `ESP32_DeviceSpecific_Tables.ino` to ESP32
2. Configure WiFi + Supabase credentials
3. Set unique `deviceId` and `devicePassword`
4. Monitor Serial output:
   ```
   ✓ Success! Table: device_ESP32_SALEM_001_readings
   ```

### 3. Test Frontend:

1. Login to dashboard
2. Upload KML file
3. Link device: "ESP32_SALEM_001"
4. Check Recent Readings - should show data
5. Check console logs:
   ```
   📊 Querying table: device_ESP32_SALEM_001_readings
   ✅ Got 150 readings from device_ESP32_SALEM_001_readings
   ```

## ⚠️ Important Notes

### Security:
- Each table has RLS (Row Level Security) enabled
- Anyone can read (filtered by device linking in frontend)
- Anyone can insert (for ESP32 transmissions)
- Update `devices` table requires authentication

### Device Password:
- Store securely in ESP32 code
- Used to validate device before creating tables
- Prevents unauthorized devices from creating tables

### Table Limits:
- Supabase free tier: 500MB database size
- Each device table is isolated
- Monitor total database size in Supabase dashboard

### Migration from Old System:
If you have data in old `sensor_readings` table:

```sql
-- Example: Migrate data to device table
INSERT INTO device_ESP32_SALEM_001_readings (sensor_id, value, timestamp, rssi)
SELECT sensor_id, value, timestamp, rssi
FROM sensor_readings
WHERE device_identifier = 'ESP32_SALEM_001';
```

## 🚀 Next Steps

1. ✅ Run `SETUP_DEVICE_SPECIFIC_TABLES.sql` in Supabase
2. ✅ Update ESP32 code for each device
3. ✅ Frontend automatically uses device tables
4. ⏳ Implement KML location dropdown filtering (next task)
5. ⏳ Test with multiple devices

## 🔍 Troubleshooting

### ESP32 shows "Invalid device password":
- Check devicePassword matches in database
- Verify deviceId is correct

### Frontend shows empty dashboard:
- Check console: "User linked devices: []"
- Verify KML has `linked_device_id` set in database:
  ```sql
  SELECT linked_device_id FROM kml_overlays WHERE owner_user_id = 'your-user-id';
  ```

### Table not auto-created:
- Check Supabase logs for errors
- Verify RPC function exists:
  ```sql
  SELECT * FROM pg_proc WHERE proname = 'insert_device_reading';
  ```

### Can't query device table:
- Check table exists:
  ```sql
  SELECT * FROM list_device_tables();
  ```
- Verify RLS policies allow SELECT

## 📊 Monitoring

### Check all device tables:
```sql
SELECT * FROM list_device_tables();
```

### Check recent readings from specific device:
```sql
SELECT * FROM device_ESP32_SALEM_001_readings 
ORDER BY timestamp DESC 
LIMIT 10;
```

### Count readings per device:
```sql
SELECT 
    table_name,
    device_id,
    (SELECT COUNT(*) FROM identifier(table_name)) as reading_count
FROM list_device_tables();
```

---

## Summary

✅ **Each device now has its own table**
✅ **Auto-created on first ESP32 transmission**
✅ **Complete data isolation between devices**
✅ **Frontend queries correct device table based on KML linking**
✅ **Secure with device passwords**

Ready to proceed with location dropdown filtering!
