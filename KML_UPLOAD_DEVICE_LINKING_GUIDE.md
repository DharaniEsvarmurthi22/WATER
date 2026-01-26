# 📱 KML Upload with Device Linking - User Guide

## Overview

When you upload a KML file (village boundary, region, etc.), you'll see a popup that allows you to link an ESP32 device to that boundary. This creates a complete connection between:
- **You** (the user)
- **Your ESP32 device**
- **Your KML boundary**

---

## 🎯 How It Works

### Step-by-Step Process:

```
1. Upload KML File
   ↓
   Enter overlay name (optional)
   Select .kml file from computer
   Click "Upload KML"
   ↓
2. Popup Appears: "Link ESP32 Device to KML"
   ↓
   Enter Device ID (e.g., ESP32-SALEM-001)
   Enter Device Name (optional)
   Enter Device Password (required)
   ↓
3. Click "Link Device"
   ↓
   System:
   - Claims device (one-time)
   - Links device to KML boundary
   - Links both to your user account
   ↓
4. Success!
   - Redirects to dashboard
   - KML boundary visible on map
   - Sensor data from device shows within boundary
```

---

## 🔐 Device Claiming Rules

### ✅ One-Time Claim (But Editable)

**What this means:**
- You can claim a device **once** with its ID and password
- After claiming, the device is **yours**
- **Nobody else** can claim your device (protection)
- **You can edit** device details anytime (name, location)
- You can **re-claim** (enter credentials again) to update

**Example:**
```
User A claims ESP32-SALEM-001
→ Device is now owned by User A
→ User B tries to claim ESP32-SALEM-001
→ ❌ Error: "Device already claimed by another user"

User A tries to claim ESP32-SALEM-001 again
→ ✅ Success! Device details can be updated
```

---

## 📋 Popup Fields Explained

### 1. Device ID * (Required)
- **Format:** ESP32-SALEM-001 (or your device identifier)
- **What it is:** Unique ID of your ESP32 device
- **Where to find it:** Programmed into your ESP32 device

### 2. Device Name (Optional)
- **Format:** Any friendly name (e.g., "Salem Water Monitor")
- **What it is:** Display name for your device
- **Can edit later:** Yes, anytime from dashboard

### 3. Device Password * (Required)
- **Format:** Secret key set in your ESP32 device
- **What it is:** Security password for claiming
- **One-time use:** Only needed when claiming device

---

## 🔗 Triple Linking System

When you link a device to KML, three connections are made:

```
┌─────────────┐
│   YOU       │ ←──────────┐
│  (User)     │            │
└─────────────┘            │
       ↓                   │
    Owns                 Owns
       ↓                   │
┌─────────────┐            │
│   DEVICE    │ ←───Links to───┐
│  ESP32-001  │                │
└─────────────┘                │
       ↓                       │
   Linked to                   │
       ↓                       │
┌─────────────┐                │
│     KML     │ ───────────────┘
│  Boundary   │
└─────────────┘
```

**What this means:**
- Device is **user-specific** (you own it)
- Device is **KML-specific** (linked to boundary)
- KML is **user-specific** (you own it)
- Data filtering is automatic based on these links

---

## ⚡ Quick Actions

### Option 1: Link New Device
```
1. Enter device ID and password
2. Device will be claimed for the first time
3. Device links to KML
4. Done!
```

### Option 2: Link Existing Claimed Device
```
1. Enter device ID and password
2. System recognizes you already own it
3. Device links to KML
4. Previous KML (if any) is unlinked
5. Done!
```

### Option 3: Skip for Now
```
1. Click "Skip for Now"
2. KML is uploaded but no device linked
3. You can link a device later from dashboard
```

---

## 🎨 Popup Features

### Visual Indicators:
- ✅ **Success messages** - Green background
- ❌ **Error messages** - Red background
- ⏳ **Loading states** - Blue background
- 💡 **Tips** - Info boxes

### Smart Behavior:
- Shows if you already have claimed devices
- Validates input before submitting
- Clear error messages if something goes wrong
- Auto-redirects to dashboard on success

---

## ❓ Common Scenarios

### Scenario 1: First Time Claiming
```
User: Uploads KML
Popup: Appears
User: Enters ESP32-SALEM-001 + password
System: ✅ Device claimed for first time!
System: ✅ Linked to KML!
Result: Device now shows on dashboard with boundary
```

### Scenario 2: Already Claimed by You
```
User: Uploads new KML
Popup: Appears
User: Enters ESP32-SALEM-001 (already owns it) + password
System: ✅ Device verified!
System: ✅ Re-linked to new KML!
Result: Old KML unlinked, new KML linked
```

### Scenario 3: Already Claimed by Someone Else
```
User A: Previously claimed ESP32-SALEM-001
User B: Uploads KML
User B: Enters ESP32-SALEM-001 + password
System: ❌ Error: "Device already claimed by another user"
Solution: User B must contact admin to reassign device
```

### Scenario 4: Wrong Password
```
User: Enters ESP32-SALEM-001 + wrong password
System: ❌ Error: "Invalid device identifier or password"
Solution: Double-check password and try again
```

---

## 🛠️ Technical Details

### Frontend Integration

**File:** `frontend/upload_kml.html`
- Modal popup with form fields
- Responsive design
- Clear instructions

**File:** `frontend/upload_kml_new.js`
- Handles KML upload
- Shows modal after successful upload
- Calls backend functions for claiming and linking

### Backend Functions Used

1. **`claim_device(p_device_identifier, p_secret)`**
   - Claims device with password
   - Prevents re-claiming by others
   - Allows re-claiming by same user

2. **`update_device(p_device_identifier, p_device_name, p_location_id)`**
   - Updates device name (if provided in modal)
   - Optional, only if user enters a name

3. **`link_device_to_kml(p_device_identifier, p_kml_overlay_id)`**
   - Links device to KML boundary
   - Updates both device and KML tables
   - Validates ownership

---

## 📊 Database Changes

When you link a device to KML:

```sql
-- devices table updated:
UPDATE devices SET
  user_id = 'your-user-id',
  kml_overlay_id = 'kml-uuid',
  claimed_at = NOW(),
  updated_at = NOW()
WHERE device_identifier = 'ESP32-SALEM-001';

-- kml_overlays table updated:
UPDATE kml_overlays SET
  linked_device_id = 'ESP32-SALEM-001',
  device_identifier = 'ESP32-SALEM-001',
  updated_at = NOW()
WHERE id = 'kml-uuid';
```

**Result:** Bidirectional link between device and KML

---

## ✅ Requirements Satisfied

Based on your sir's requirements:

### 1. ✅ "ESP linking should be one-time but later editable"
- Device can be claimed once (one-time)
- Owner can edit device details anytime (Edit button on dashboard)
- Can re-claim with same credentials (edit mode)

### 2. ✅ "Link ESP to both KML and User"
- Device → User (ownership)
- Device → KML (boundary link)
- KML → User (ownership)
- All three linked together

### 3. ✅ "Devices are user-specific"
- Each user owns their devices
- Can't claim others' devices
- Admin can reassign from backend

### 4. ✅ "Popup during KML upload"
- Popup appears after KML upload
- Asks for device linking
- Can skip if needed

---

## 🎯 User Benefits

1. **Seamless Experience**
   - Upload KML → Immediately link device
   - One smooth workflow

2. **Security**
   - Password protection
   - Can't steal others' devices
   - One-time claim protection

3. **Flexibility**
   - Can skip and link later
   - Can edit device details anytime
   - Can change KML boundaries

4. **Clarity**
   - Clear instructions in popup
   - Visual feedback (success/error)
   - Helpful error messages

---

## 🚀 Next Steps

After linking device to KML:

1. **Dashboard** → Shows device data within KML boundary
2. **Edit Device** → Click Edit button to update details
3. **Upload More KML** → Repeat process for other devices
4. **View Map** → See boundaries and sensor readings

---

## 💡 Tips

- **Keep credentials safe:** Device password is needed for claiming
- **Use descriptive names:** Makes devices easier to identify
- **One KML per device:** Uploading new KML for same device replaces old one
- **Skip if unsure:** You can always link devices later from dashboard

---

**This popup ensures your devices are properly linked to your KML boundaries while maintaining security and user-specific ownership!** 🎉
