# RLS SYSTEM ARCHITECTURE DIAGRAM

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WATER DASHBOARD RLS SYSTEM                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ 1. ESP32 DEVICES (Data Sources)                                          │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ESP32_SALEM_01     ESP32_SALEM_02     ESP32_YERCAUD_01                │
│        │                   │                    │                         │
│        │ POST data         │ POST data          │ POST data               │
│        └───────────────────┴────────────────────┘                         │
│                            │                                              │
│                            ▼                                              │
│                  ┌──────────────────────┐                                 │
│                  │  Supabase REST API   │                                 │
│                  │   /sensor_readings   │                                 │
│                  └──────────────────────┘                                 │
│                            │                                              │
└────────────────────────────┼──────────────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 2. DATABASE LAYER (Supabase PostgreSQL)                                  │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ TABLE: device_assignments (THE "KEY")                            │    │
│  ├──────────────┬──────────────┬──────────────┬──────────────┐     │    │
│  │ user_id      │ device_id    │ device_name  │ assigned_at  │     │    │
│  ├──────────────┼──────────────┼──────────────┼──────────────┤     │    │
│  │ alice-uuid   │ ESP32_SALEM_01│ Salem Monitor│ 2026-01-20   │     │    │
│  │ bob-uuid     │ ESP32_SALEM_02│ Salem Sensor │ 2026-01-21   │     │    │
│  │ alice-uuid   │ ESP32_YERCAUD │ Yercaud Unit │ 2026-01-22   │     │    │
│  └──────────────┴──────────────┴──────────────┴──────────────┘     │    │
│                                                                      │    │
│  🔒 RLS Enabled: Users can only view their own assignments          │    │
│  ⚠️  Admins can modify (add/remove assignments)                     │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ TABLE: sensor_readings (THE "STORAGE")                           │    │
│  ├────────────┬──────┬────┬────┬─────────┬────────────┬──────────┐ │    │
│  │ device_id  │ lat  │ lon│ ph │ temp    │ status     │timestamp │ │    │
│  ├────────────┼──────┼────┼────┼─────────┼────────────┼──────────┤ │    │
│  │ESP32_SALEM_01│11.12│77.5│7.2 │ 28.5    │ active     │10:00:00  │ │    │
│  │ESP32_SALEM_02│11.15│77.6│7.5 │ 29.0    │ active     │10:00:05  │ │    │
│  │ESP32_YERCAUD │11.78│78.2│7.1 │ 22.5    │ active     │10:00:10  │ │    │
│  │ESP32_SALEM_01│11.12│77.5│7.3 │ 28.6    │ active     │10:05:00  │ │    │
│  │ESP32_SALEM_02│11.15│77.6│7.6 │ 29.1    │ active     │10:05:05  │ │    │
│  └────────────┴──────┴────┴────┴─────────┴────────────┴──────────┘ │    │
│                                                                      │    │
│  🔒 RLS Enabled: Users only see data for their assigned devices     │    │
│  📝 anon can INSERT (for ESP32)                                     │    │
│  👀 authenticated can SELECT (filtered by device_assignments)       │    │
│  👑 Admins can see ALL data                                         │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                           │
└────────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 3. RLS SECURITY LAYER (Row Level Security Policies)                      │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Policy 1: "ESP32 devices can insert readings"                           │
│  ┌─────────────────────────────────────────────────────────────┐         │
│  │ FOR: INSERT                                                 │         │
│  │ TO: anon (ESP32 devices using anon key)                     │         │
│  │ WITH CHECK: true (allow all inserts)                        │         │
│  └─────────────────────────────────────────────────────────────┘         │
│                                                                           │
│  Policy 2: "Users see only their device data"                            │
│  ┌─────────────────────────────────────────────────────────────┐         │
│  │ FOR: SELECT                                                 │         │
│  │ TO: authenticated                                           │         │
│  │ USING: device_id IN (                                       │         │
│  │   SELECT device_id FROM device_assignments                  │         │
│  │   WHERE user_id = auth.uid()                                │         │
│  │ )                                                            │         │
│  └─────────────────────────────────────────────────────────────┘         │
│                                                                           │
│  Policy 3: "Admins see all device data"                                  │
│  ┌─────────────────────────────────────────────────────────────┐         │
│  │ FOR: SELECT                                                 │         │
│  │ TO: authenticated                                           │         │
│  │ USING: EXISTS (                                             │         │
│  │   SELECT 1 FROM user_profiles                               │         │
│  │   WHERE user_id = auth.uid() AND role = 'admin'            │         │
│  │ )                                                            │         │
│  └─────────────────────────────────────────────────────────────┘         │
│                                                                           │
└────────────────────────────────┬──────────────────────────────────────────┘
                                 │
                                 ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ 4. CLIENT LAYER (Frontend Dashboard)                                     │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────┐     ┌──────────────────────┐                  │
│  │   Regular User       │     │   Admin User         │                  │
│  │   (Alice)            │     │   (Super User)       │                  │
│  └──────────────────────┘     └──────────────────────┘                  │
│           │                              │                               │
│           │ Query:                       │ Query:                        │
│           │ SELECT * FROM                │ SELECT * FROM                 │
│           │ sensor_readings              │ sensor_readings               │
│           │                              │                               │
│           ▼                              ▼                               │
│  ┌──────────────────────┐     ┌──────────────────────┐                  │
│  │ RLS Auto-Filters:    │     │ RLS Returns:         │                  │
│  │ - ESP32_SALEM_01     │     │ - ESP32_SALEM_01     │                  │
│  │ - ESP32_YERCAUD_01   │     │ - ESP32_SALEM_02     │                  │
│  │                      │     │ - ESP32_YERCAUD_01   │                  │
│  │ (Only Alice's        │     │ (ALL devices)        │                  │
│  │  devices)            │     │                      │                  │
│  └──────────────────────┘     └──────────────────────┘                  │
│           │                              │                               │
│           │                              │                               │
│           ▼                              ▼                               │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │          Dashboard Display                                │           │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │           │
│  │  │ Salem      │  │ Yercaud    │  │ (Other     │         │           │
│  │  │ Monitor    │  │ Unit       │  │  devices   │         │           │
│  │  │ 🟢 Active  │  │ 🟢 Active  │  │  for admin)│         │           │
│  │  └────────────┘  └────────────┘  └────────────┘         │           │
│  └──────────────────────────────────────────────────────────┘           │
│                                                                           │
│  🔔 REALTIME SUBSCRIPTIONS (Also filtered by device_id)                  │
│  ┌──────────────────────────────────────────────────────────┐           │
│  │ Frontend subscribes with filter:                          │           │
│  │ device_id=in.(ESP32_SALEM_01,ESP32_YERCAUD_01)          │           │
│  │                                                           │           │
│  │ When new reading arrives:                                │           │
│  │ ✅ If device_id matches → Update dashboard               │           │
│  │ ❌ If device_id doesn't match → Ignore                   │           │
│  └──────────────────────────────────────────────────────────┘           │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│ 5. ADMIN INTERFACE (Device Manager)                                      │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  device-manager.html (Admin Only)                                        │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ 📋 Device Assignments                                    │            │
│  │                                                          │            │
│  │ Assign Device to User:                                  │            │
│  │ ┌─────────────────┬───────────────────────────────┐    │            │
│  │ │ User: Alice ▼   │ Device: ESP32_SALEM_03        │    │            │
│  │ └─────────────────┴───────────────────────────────┘    │            │
│  │                       [Assign Device]                   │            │
│  │                                                          │            │
│  │ Current Assignments:                                    │            │
│  │ ┌──────────────┬─────────┬─────────┬──────────┐       │            │
│  │ │ Device ID    │ User    │ Date    │ Action   │       │            │
│  │ ├──────────────┼─────────┼─────────┼──────────┤       │            │
│  │ │ESP32_SALEM_01│ Alice   │ Jan 20  │ [Remove] │       │            │
│  │ │ESP32_SALEM_02│ Bob     │ Jan 21  │ [Remove] │       │            │
│  │ │ESP32_YERCAUD │ Alice   │ Jan 22  │ [Remove] │       │            │
│  │ └──────────────┴─────────┴─────────┴──────────┘       │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Example 1: ESP32 Sends Data
```
1. ESP32_SALEM_01 measures water quality
2. Sends POST to /rest/v1/sensor_readings
   {
     "device_id": "ESP32_SALEM_01",
     "latitude": 11.1234,
     "longitude": 77.5678,
     "ph": 7.2,
     "temperature": 28.5,
     ...
   }
3. RLS Policy 1 allows INSERT (anon can insert)
4. Data saved to sensor_readings table
5. Realtime event triggered
6. Alice's dashboard receives event (filtered by device_id)
7. Dashboard updates with new reading
```

### Example 2: User Views Dashboard
```
1. Alice logs in
2. Frontend queries: SELECT * FROM sensor_readings
3. RLS Policy 2 kicks in:
   - Checks device_assignments for Alice's user_id
   - Finds: ESP32_SALEM_01, ESP32_YERCAUD_01
   - Returns ONLY rows where device_id IN (ESP32_SALEM_01, ESP32_YERCAUD_01)
4. Alice sees only her 2 devices
5. Bob's data (ESP32_SALEM_02) is invisible to Alice
```

### Example 3: Admin Views Dashboard
```
1. Admin logs in
2. Frontend queries: SELECT * FROM sensor_readings
3. RLS Policy 3 kicks in:
   - Checks if user has role = 'admin'
   - Admin = true
   - Returns ALL rows (no filter)
4. Admin sees all devices from all users
```

### Example 4: Admin Assigns Device
```
1. Admin opens device-manager.html
2. Selects: User = "Charlie", Device = "ESP32_ATTUR_01"
3. Clicks "Assign Device"
4. Calls: assign_device_to_user()
5. INSERT into device_assignments table
6. Charlie can now see ESP32_ATTUR_01 data immediately
7. No table creation needed (just 1 row added)
```

## Security Enforcement Points

```
┌─────────────────────────────────────────────────────────────┐
│ 🔒 SECURITY ENFORCEMENT HAPPENS AT DATABASE LEVEL           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Even if frontend has bugs or is compromised:                │
│                                                             │
│ ❌ User cannot bypass RLS by modifying JavaScript          │
│ ❌ User cannot access other users' data via API calls      │
│ ❌ User cannot see data even if they know the device_id    │
│ ❌ User cannot disable RLS from frontend                   │
│                                                             │
│ ✅ Database enforces rules BEFORE returning data           │
│ ✅ Impossible to see unauthorized data                     │
│ ✅ Each query automatically filtered                       │
│ ✅ Works for direct queries AND realtime subscriptions     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Performance Characteristics

```
┌───────────────────────────────────────────────────────┐
│ TABLE: sensor_readings (Indexed)                     │
├───────────────────────────────────────────────────────┤
│ Index: device_id + timestamp DESC                    │
│                                                       │
│ Query: "Get latest readings for device ESP32_01"     │
│ Speed: 🚀 Instant (uses index)                       │
│                                                       │
│ Query: "Get all readings for user's devices"         │
│ Speed: 🚀 Fast (index + RLS filter)                  │
│                                                       │
│ Scalability:                                         │
│ - 10 devices = Fast ✅                               │
│ - 100 devices = Fast ✅                              │
│ - 1,000 devices = Fast ✅                            │
│ - 10,000 devices = Fast ✅                           │
│                                                       │
│ (All use same indexes, same query plan)              │
└───────────────────────────────────────────────────────┘
```

## Comparison: Old vs New System

```
┌────────────────────────────────────────────────────────────────┐
│ OLD SYSTEM (Device-Specific Tables)                            │
├────────────────────────────────────────────────────────────────┤
│ device_ESP32_SALEM_01_readings                                 │
│ device_ESP32_SALEM_02_readings                                 │
│ device_ESP32_YERCAUD_01_readings                               │
│ ...                                                            │
│ (100 devices = 100 tables)                                     │
│                                                                │
│ Problems:                                                      │
│ ❌ Slow to create new tables                                   │
│ ❌ Hard to query across devices                                │
│ ❌ Difficult to backup/restore                                 │
│ ❌ Schema changes = Change 100 tables                          │
│ ❌ Poor database performance                                   │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ NEW SYSTEM (RLS with Centralized Table)                        │
├────────────────────────────────────────────────────────────────┤
│ sensor_readings (one table for all devices)                    │
│ device_assignments (device-to-user mapping)                    │
│                                                                │
│ Benefits:                                                      │
│ ✅ Add device = Add 1 row (instant)                           │
│ ✅ Easy to query across devices                                │
│ ✅ Simple backup/restore                                       │
│ ✅ Schema changes = Alter 1 table                              │
│ ✅ Excellent database performance                              │
│ ✅ Database-enforced security                                  │
│ ✅ Fast realtime subscriptions                                 │
└────────────────────────────────────────────────────────────────┘
```
