# Device-KML Linking Guide

Your system is already set up! Here's how to use it:

## 🎯 Complete Workflow

### 1. **User Claims Device**
   - Login to dashboard (http://localhost:3000)
   - In left sidebar, find "Device Linking" section
   - Enter:
     - Device ID: `ESP32-SALEM-001`
     - Password: `your_device_password`
   - Click "LINK DEVICE"
   
### 2. **User Uploads KML**
   - Go to "Upload Overlays" page
   - Select your claimed device from dropdown
   - Choose KML file (village boundaries)
   - Click "Upload KML"
   - **System automatically links KML to device**

### 3. **View Data**
   - Dashboard shows only YOUR device data
   - Data points appear within YOUR KML boundaries
   - Real-time updates every 15 seconds

---

## 🔐 Admin Dashboard

### Admin Can View Any User's Data:
1. Login as admin
2. Select user from dropdown (coming in next update)
3. See their KML + device data

---

## ✅ Testing Steps

### Step 1: Claim Your ESP32 Device
```
Device ID: ESP32-SALEM-001
Password: (create a password, e.g., "mydevice123")
```

### Step 2: Run SQL to Register Device
Run in Supabase SQL Editor:
```sql
-- Create device entry (if not auto-created)
INSERT INTO public.devices (device_id, device_password, is_active)
VALUES ('ESP32-SALEM-001', 'mydevice123', true)
ON CONFLICT (device_id) DO NOTHING;
```

### Step 3: Claim Device from Dashboard
- Login to dashboard
- Device Linking section → Enter ID and password
- Click LINK DEVICE

### Step 4: Upload KML
- Go to upload page (upload_kml.html)
- Select "ESP32-SALEM-001" from dropdown
- Upload your KML file
- System links them automatically!

### Step 5: View Your Data
- Return to main dashboard
- See your device data within your KML boundaries
- Only YOUR data is visible (not other users')

---

## 📊 How It Works

```
User 1:
  ├── Claims ESP32-DEVICE-A
  ├── Uploads KML-VILLAGE-A
  └── Sees data from DEVICE-A in VILLAGE-A boundaries

User 2:
  ├── Claims ESP32-DEVICE-B
  ├── Uploads KML-VILLAGE-B
  └── Sees data from DEVICE-B in VILLAGE-B boundaries

Admin:
  └── Can select ANY user and view their dashboard
```

---

## 🔧 Troubleshooting

### Device not appearing in dropdown?
1. Check device is claimed:
   ```sql
   SELECT * FROM devices WHERE device_id = 'ESP32-SALEM-001';
   ```
2. Verify owner_user_id matches your user ID

### KML not uploading?
1. Check file format (must be .kml or .kmz)
2. Verify device is selected in dropdown
3. Check browser console for errors

### Data not showing?
1. Verify ESP32 is sending data (check Serial Monitor)
2. Check sensor_readings table:
   ```sql
   SELECT * FROM sensor_readings 
   WHERE device_id = 'ESP32-SALEM-001' 
   ORDER BY timestamp DESC 
   LIMIT 10;
   ```
3. Verify owner_user_id is set on readings

---

## 🚀 Next Steps

### To Make System Fully Automatic:

1. **Auto-link sensor data to user when device claimed**
   - ✅ Already done! (claim_device function updates owner_user_id)

2. **Filter dashboard data by logged-in user**
   - Update data.js to fetch only user's devices
   - Show only readings where owner_user_id = current user

3. **Admin user selector**
   - Add dropdown in admin dashboard
   - Call admin_get_all_users() function
   - Switch context to selected user

Would you like me to implement these automatic features now?
