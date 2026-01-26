# 🌊 Water Quality Monitoring System

**Fully Automated ESP32 + Supabase + KML Dashboard**

Upload ANY KML file → System automatically reads villages, boundaries, and markers!

---

## 🚀 Quick Start

1. **Setup Supabase:** Run SQL files
2. **Configure ESP32:** Set WiFi + GPS coordinates  
3. **Upload KML:** Upload your village boundaries (like `nallampatti_cluster.kml`)
4. **Done!** Dashboard automatically shows everything

**📖 Complete Guide:** See [SETUP_GUIDE.md](SETUP_GUIDE.md)

---

## 📁 Key Files

### ESP32
- `ESP32_Supabase_Direct.ino` - Universal code (works with ANY KML)

### Database
- `create_sensor_readings_table.sql` - Sensor data storage
- `create_kml_overlays.sql` - KML file management

### Dashboard
- `frontend/` - Web interface
- `upload_kml.html` - KML upload page

### Documentation
- `SETUP_GUIDE.md` - Complete setup instructions
- `DYNAMIC_KML_SYSTEM.md` - Technical details

---

## ✨ Key Features

✅ **100% Automated** - No hardcoded locations  
✅ **Works with ANY KML** - Villages, markers, boundaries  
✅ **User-Specific** - Each user has their own KML  
✅ **Device-Linked** - Each device has its own KML  
✅ **Replace Anytime** - Upload new KML = instant update  
✅ **Zero Maintenance** - Add villages by uploading KML only

---

## 🎯 How It Works

```
ESP32 → Sends GPS + sensor data
         ↓
      Supabase → Stores data
         ↓
     Dashboard → Loads KML
         ↓
     Matches GPS to KML boundaries
         ↓
     "Nallampatti - pH: 7.2, Good"
```

**Change KML file = Zero code changes needed!**

---

## 🛠️ Requirements

- ESP32 board
- WiFi connection
- Supabase account (free)
- KML file of your area

---

## 📊 Example KML

```xml
<kml>
  <Document>
    <Placemark>
      <name>Village Name</name>
      <Polygon>
        <!-- Your boundary coordinates -->
      </Polygon>
    </Placemark>
  </Document>
</kml>
```

Dashboard automatically reads village names and boundaries!

---

## 🎓 Support

- **Setup Guide:** [SETUP_GUIDE.md](SETUP_GUIDE.md)
- **System Details:** [DYNAMIC_KML_SYSTEM.md](DYNAMIC_KML_SYSTEM.md)
- **Device Claiming:** [DEVICE_CLAIMING_GUIDE.md](DEVICE_CLAIMING_GUIDE.md)

---

**Made with ❤️ for automated water quality monitoring**
