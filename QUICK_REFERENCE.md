# 🚀 Quick Reference - KML Upload with Device Linking

## For Users

### Upload KML and Link Device (Complete Process)

```
1. Go to Upload KML page
2. Enter overlay name (optional)
3. Select .kml file
4. Click "Upload KML"
   ↓
5. Popup appears automatically
6. Enter:
   - Device ID (required): ESP32-SALEM-001
   - Device Name (optional): Salem Water Monitor
   - Device Password (required): [your secret]
7. Click "Link Device"
   ↓
8. Success! Redirects to dashboard
```

### Button Options in Popup
- **"Link Device"** → Claims device and links to KML
- **"Skip for Now"** → KML uploaded, no device linked yet

---

## For Developers

### Frontend Files
- **upload_kml.html** - Modal popup HTML
- **upload_kml_new.js** - Upload and linking logic

### Backend Functions
```sql
claim_device(p_device_identifier, p_secret)
→ Claims device (one-time with edit capability)

update_device(p_device_identifier, p_device_name, p_location_id)
→ Updates device details

link_device_to_kml(p_device_identifier, p_kml_overlay_id)
→ Links device to KML boundary
```

### Key Code Snippet
```javascript
// Claim device
const { data } = await supabase.rpc('claim_device', {
    p_device_identifier: 'ESP32-SALEM-001',
    p_secret: 'password'
});

// Link to KML
await supabase.rpc('link_device_to_kml', {
    p_device_identifier: 'ESP32-SALEM-001',
    p_kml_overlay_id: kmlId
});
```

---

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Device already claimed by another user" | Someone else owns it | Contact admin to reassign |
| "Invalid device identifier or password" | Wrong credentials | Check device ID and password |
| "No KML file to link" | Upload failed | Try uploading again |
| "Failed to link device to KML" | Ownership mismatch | Ensure you own both device and KML |

---

## Testing Scenarios

### ✅ Scenario 1: New Device
- Enter unclaimed device ID + password
- Result: Device claimed and linked

### ✅ Scenario 2: Your Device
- Enter device you already own + password
- Result: Device re-verified and linked to new KML

### ❌ Scenario 3: Others' Device
- Enter device owned by someone else
- Result: Error message

---

## Documentation Files

- **KML_UPLOAD_DEVICE_LINKING_GUIDE.md** - Complete user guide
- **FRONTEND_BACKEND_INTEGRATION.md** - Technical integration details
- **COMPLETE_DEVICE_LINKING_GUIDE.md** - Full system documentation

---

## Status

✅ **Frontend-Backend Integration Complete**
✅ **All Requirements Satisfied**
✅ **Ready for Testing**

---

**Quick Start:** Upload a KML file and the popup will guide you through device linking!
