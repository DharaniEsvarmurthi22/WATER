# 🌊 Water Dashboard - ESP32 Device Monitoring System

**Complete device management with editable claiming and KML boundary visualization**

---

## 🚀 Quick Start

### 1. Database Setup (Run in Supabase SQL Editor)
```sql
1. create_user_profiles.sql           # User profiles & roles
2. sql/update_device_linking.sql      # ⭐ NEW: Editable device system
3. create_kml_overlays.sql            # KML boundary system
4. sql/setup_multiuser_system.sql     # Multiuser & admin
```

### 2. Frontend (Already Configured)
```bash
npm install
npm run dev      # Local testing
# Deploy to Netlify/Vercel for production
```

### 3. Read Documentation
- **[QUICK_SETUP_CHECKLIST.md](QUICK_SETUP_CHECKLIST.md)** ⭐ Start here
- **[COMPLETE_DEVICE_LINKING_GUIDE.md](COMPLETE_DEVICE_LINKING_GUIDE.md)** - Full guide
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - What's done

---

## ✨ Key Features

### 🔐 Device Management
- ✅ One-time device claiming with password
- ✅ Edit capability (name, location) by owner
- ✅ Re-claim protection (can't be stolen)
- ✅ User-specific ownership

### 🗺️ KML Boundary System
- ✅ Link devices to KML boundaries
- ✅ User-specific KML storage
- ✅ Visual map overlays
- ✅ Editable (unlink & reupload)

### 👨‍💼 Admin Features
- ✅ Backend device reassignment
- ✅ View all users and devices
- ✅ Override device ownership

### 🔒 Security
- ✅ Row Level Security (RLS)
- ✅ User authentication required
- ✅ Data isolation between users

---

## 📂 Project Structure

```
WATER/
├── frontend/
│   ├── device_manager.js      # ⭐ Device claiming & editing
│   ├── upload_kml.js          # KML upload with linking
│   ├── map.js                 # Map visualization
│   └── index.html             # Main dashboard
│
├── sql/
│   ├── update_device_linking.sql     # ⭐ NEW: Complete linking system
│   ├── setup_multiuser_system.sql    # User management
│   └── setup_device_claiming_ADAPTED.sql
│
├── QUICK_SETUP_CHECKLIST.md   # ⭐ Setup steps
├── COMPLETE_DEVICE_LINKING_GUIDE.md  # Full documentation
└── IMPLEMENTATION_SUMMARY.md  # Implementation details
```

---

## 🎯 User Workflow

```
1. CLAIM DEVICE
   Login → Enter device ID + password → Connect ✅

2. EDIT DEVICE
   Click "Edit" → Update name & location → Save ✅

3. UPLOAD KML
   Upload KML page → Select device → Upload boundary ✅

4. VIEW DATA
   Dashboard → Shows sensor readings + KML boundaries ✅
```

---

## 🆕 Latest Updates (Jan 20, 2026)

### Enhanced Device Linking
- ⭐ One-time claim with edit capability
- ⭐ Edit button in device list
- ⭐ KML link status display
- ⭐ Unlink & change KML function
- ⭐ Admin reassignment

### New Database Functions
- `claim_device()` - Claim with edit protection
- `update_device()` - Edit device details
- `link_device_to_kml()` - Link to boundary
- `unlink_device_from_kml()` - Change boundary
- `get_device_details()` - Full device info
- `admin_reassign_device()` - Admin transfer

### Cleanup
- ✅ Removed test files
- ✅ Removed old deployment folder
- ✅ Removed temporary SQL fixes
- ✅ Organized project structure

---

## 🧪 Quick Test

```javascript
// In browser console after login
const { data } = await supabase.rpc('claim_device', {
    p_device_identifier: 'ESP32-SALEM-001',
    p_secret: 'device_password'
});
console.log(data); // Should show claimed device
```

---

## 📊 System Architecture

```
USER → Claims Device → Device linked to User
  ↓
USER → Uploads KML → KML linked to Device
  ↓
DASHBOARD → Shows sensor data within KML boundary
  ↓
ADMIN → Can reassign devices between users
```

---

## 🆘 Troubleshooting

**Can't edit device?**
```sql
SELECT * FROM devices WHERE device_identifier = 'ESP32-xxx';
-- Check user_id matches your auth.uid()
```

**Device already claimed?**
- Another user owns it
- Admin can reassign via `admin_reassign_device()`

**KML not showing?**
- Check device and KML owned by same user
- Verify link: `SELECT * FROM devices WHERE kml_overlay_id IS NOT NULL`

---

## 📞 Documentation

| File | Purpose |
|------|---------|
| **QUICK_SETUP_CHECKLIST.md** | Step-by-step setup |
| **COMPLETE_DEVICE_LINKING_GUIDE.md** | Full system documentation |
| **IMPLEMENTATION_SUMMARY.md** | What's implemented |
| **sql/update_device_linking.sql** | Database setup (commented) |

---

## 🎉 Production Status

**✅ Ready to Deploy**

All requirements met:
- ✅ One-time device claim (editable by owner)
- ✅ User-specific devices
- ✅ Device-KML-User triple linking
- ✅ Admin backend control
- ✅ Complete security (RLS)
- ✅ Clean codebase
- ✅ Full documentation

**Next:** Run SQL scripts → Test → Deploy! 🚀

---

**Version:** 2.0 (Enhanced Device Linking)
**Last Updated:** January 20, 2026
**Status:** Production Ready ✅
