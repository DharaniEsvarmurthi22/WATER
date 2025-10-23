# 🌊 Water Quality Monitoring Dashboard

## Project Overview

A **real-time water quality monitoring system** for 4 lakes using ESP32 + LoRa sensors and cloud-based dashboard.

---

## 📍 Monitored Locations

| Location | City | Sensors |
|----------|------|---------|
| **Ukkadam Lake** | Coimbatore | pH, Turbidity, Temperature, TDS |
| **Singanallur Lake** | Coimbatore | pH, Turbidity, Temperature, TDS |
| **Red Hills Lake** | Chennai | pH, Turbidity, Temperature, TDS |
| **Porur Lake** | Chennai | pH, Turbidity, Temperature, TDS |

---

## 🔧 System Architecture

```
┌─────────────┐    LoRa 433MHz    ┌─────────────┐    WiFi/HTTPS    ┌──────────┐
│   ESP32     │ ═════════════════► │   ESP32     │ ═══════════════► │ Supabase │
│   Sender    │                    │  Receiver   │                  │ Database │
│  (Sensors)  │                    │   (WiFi)    │                  │          │
└─────────────┘                    └─────────────┘                  └────┬─────┘
                                                                          │
                                                                     WebSocket
                                                                          │
                                                                          ▼
                                                                   ┌─────────────┐
                                                                   │     Web     │
                                                                   │  Dashboard  │
                                                                   └─────────────┘
```

---

## ✨ Key Features

### 🗺️ Interactive Map
- Street and Satellite view toggle
- Real-time location markers
- Data heatmap visualization
- KML/GeoJSON overlay support

### 📊 Real-Time Monitoring
- Live sensor data updates (every ~20 seconds)
- Historical charts (1h, 6h, 24h, 7d, 30d)
- Location-based statistics
- Sensor-specific filtering

### 🔍 Data Analysis
- Value range filtering
- Location-based filtering
- Sensor type filtering
- CSV data export

### 📱 Responsive Design
- Works on desktop, tablet, and mobile
- Modern UI with TailwindCSS
- Water-themed color scheme

---

## 💻 Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | HTML5, JavaScript, MapLibre GL JS, TailwindCSS |
| **Backend** | Supabase (PostgreSQL + Real-time) |
| **Hardware** | ESP32, LoRa RA-02 (433MHz, SX1278) |
| **Hosting** | Netlify (Frontend), Supabase (Backend) |
| **Mapping** | OpenStreetMap, ESRI Satellite Imagery |

---

## 📡 Communication Protocol

**LoRa Configuration:**
- Frequency: 433MHz (ISM band)
- Spreading Factor: 12 (long range mode)
- Bandwidth: 62.5 kHz
- Range: ~5-10 km (line of sight)

**Data Format:**
```
LOC:ukkadam,PH:7.2,TURB:15.3,TEMP:25.5,TDS:280.5
```

---

## 🎯 Project Achievements

✅ **Real-time Data Collection** - ESP32 sensors transmit via LoRa  
✅ **Cloud Storage** - Supabase PostgreSQL database  
✅ **Live Dashboard** - WebSocket-based real-time updates  
✅ **Interactive Visualization** - Map, charts, and heatmaps  
✅ **Data Filtering** - Location, sensor type, and value range  
✅ **Mobile Responsive** - Works on all devices  
✅ **Scalable Architecture** - Can add more locations easily  
✅ **Production Ready** - Deployed and accessible online  

---

## 💰 Cost Analysis

| Item | Cost |
|------|------|
| ESP32 Dev Board (×2) | ₹600-1000 |
| LoRa RA-02 Module (×2) | ₹700-900 |
| **Hardware Total** | **₹1300-1900** |
| | |
| Netlify Hosting | ₹0 (FREE) |
| Supabase Backend | ₹0 (FREE) |
| **Monthly Cost** | **₹0** |

**Free Tier Limits:**
- Netlify: 100GB bandwidth/month
- Supabase: 500MB storage (~500,000 readings)
- Total capacity: ~34 days continuous operation

---

## 📊 Performance Metrics

- **Data Update Frequency**: Every 20 seconds
- **Locations Monitored**: 4
- **Sensors per Location**: 4
- **Total Data Points**: 16 readings every 20 seconds
- **Daily Readings**: ~69,120 readings/day
- **Dashboard Response**: < 1 second
- **Real-time Latency**: < 2 seconds

---

## 🚀 Live Demo

**Dashboard URL**: [Your Netlify URL]

**Login Credentials**:
- Email: [your-email]
- Password: [your-password]

---

## 📈 Future Enhancements

- **Alerts System**: SMS/Email notifications for threshold violations
- **Machine Learning**: Predict water quality trends
- **Mobile App**: Native Android/iOS application
- **More Locations**: Expand to additional water bodies
- **Advanced Analytics**: Water quality reports and insights

---

## 📚 Documentation

- **Setup Guide**: `COMPLETE_SETUP_GUIDE.md`
- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Integration Guide**: `INTEGRATION_COMPLETE.md`

---

## 👨‍💻 Developer

**Name**: [Your Name]  
**Email**: [Your Email]  
**GitHub**: [Your GitHub]

---

## 📄 License

MIT License - Open source for educational and research purposes

---

**Made with 💧 for water quality monitoring**

*This project demonstrates IoT integration, real-time data processing, cloud deployment, and modern web development practices.*
