# 🚰 Water Quality Monitoring System# 🚰 Water Quality Monitoring Dashboard# Water Dashboard - Real-time Water Monitoring System



Real-time water quality monitoring for 4 lakes using **ESP32 + LoRa (433MHz)** → **Supabase** → **Live Dashboard**



![Status](https://img.shields.io/badge/Status-Production_Ready-success) ![Hardware](https://img.shields.io/badge/Hardware-ESP32_LoRa-blue) ![Frequency](https://img.shields.io/badge/LoRa-433MHz-orange)A **real-time water quality monitoring system** for lakes in Coimbatore and Chennai using **ESP32 + LoRa** sensors and **Supabase** backend.A vibrant, professional web application for real-time water data visualization with ESP32 integration, similar to peopleswaterdata.org but with enhanced features and modern design.



---



## 🎯 Quick Start![System Status](https://img.shields.io/badge/Status-Active-success)![Water Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green)



1. **Read Setup Guide**: Open `COMPLETE_SETUP_GUIDE.md`![Test Mode](https://img.shields.io/badge/Test_Mode-Enabled-blue)![License](https://img.shields.io/badge/License-MIT-blue)

2. **Wire Hardware**: Connect 2× ESP32 + LoRa RA-02 modules

3. **Upload Code**:![Locations](https://img.shields.io/badge/Locations-4-orange)![Version](https://img.shields.io/badge/Version-1.0.0-orange)

   - `ESP32_LoRa_Sender.ino` → Sender ESP32 (no config needed)

   - `ESP32_LoRa_Receiver.ino` → Receiver ESP32 (add WiFi + Supabase credentials)

4. **Start Dashboard**: `cd frontend && node server.js`

5. **Open Browser**: http://localhost:5000## 🌊 Monitored Locations## 🌊 Features



---



## 📍 Monitored Locations| Location | City | Coordinates |### 🔐 Authentication & Security



| Location | City | Sensors ||----------|------|-------------|- **Secure Login System**: Supabase Auth integration with email/password

|----------|------|---------|

| **Ukkadam Lake** | Coimbatore | pH, Turbidity, Temperature, TDS || **Ukkadam Lake** | Coimbatore | 11.0168°N, 76.9558°E |- **Protected Routes**: Only authenticated users can access the dashboard

| **Singanallur Lake** | Coimbatore | pH, Turbidity, Temperature, TDS |

| **Red Hills Lake** | Chennai | pH, Turbidity, Temperature, TDS || **Singanallur Lake** | Coimbatore | 11.0060°N, 77.0330°E |- **Row Level Security**: Database-level access control

| **Porur Lake** | Chennai | pH, Turbidity, Temperature, TDS |

| **Red Hills Lake** | Chennai | 13.1840°N, 80.1780°E |- **HTTPS & CORS**: Secure data transmission

---

| **Porur Lake** | Chennai | 13.0358°N, 80.1560°E |

## 🏗️ System Architecture

### 🗺️ Interactive Mapping

```

ESP32 Sender          ESP32 Receiver         Supabase            Dashboard## 📊 Monitored Parameters- **MapLibre GL JS**: High-performance vector maps

(LoRa 433MHz)        (LoRa + WiFi)         (PostgreSQL)        (Browser)

      │                     │                    │                  │- **Dual Map Styles**: Street view and satellite imagery toggle

      │   Transmit          │    HTTP POST       │   Real-time      │

      │   Sensor Data       │    to Cloud        │   WebSocket      │- **pH Level**: 6.5-8.5 (drinking water standard)- **Custom Markers**: Real-time sensor location indicators

      ├────────────────────►│───────────────────►│─────────────────►│

      │                     │                    │                  │- **Turbidity**: 0-25 NTU (water clarity)- **Click-to-Dashboard**: Detailed sensor views on marker click

   Cycles through        Parses &             Stores &          Live Charts

   4 locations          Forwards              Triggers          Auto-Update- **Temperature**: 15-35°C (ambient water temp)- **Layer Controls**: Toggle sensors, heatmaps, and overlays

```

- **TDS**: 0-500 ppm (total dissolved solids)- **File Upload Support**: KML and GeoJSON overlay import

**Data Flow:**

1. Sender cycles: ukkadam → singanallur → redhills → porur (20s intervals)- **External URL Loading**: Load geospatial data from URLs

2. Sends via LoRa: `LOC:ukkadam,PH:100.1,TURB:101.1,TEMP:102.1,TDS:103.1`

3. Receiver parses packet, posts to Supabase REST API## 🚀 Quick Start

4. Supabase triggers real-time update to all connected dashboards

5. Charts update automatically (no refresh needed)### 📊 Real-time Data Visualization



---### 📖 **Complete Setup Guide**- **Live Updates**: WebSocket-based real-time data streaming



## 📁 Project Files- **Interactive Charts**: Historical trends and live readings



| File | Purpose | Action Needed |**👉 See [COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md) for full instructions**- **Statistics Dashboard**: Active sensors, averages, and trends

|------|---------|---------------|

| `COMPLETE_SETUP_GUIDE.md` | **START HERE** - Full instructions | Read this first |- **Data Export**: CSV export functionality

| `ESP32_LoRa_Sender.ino` | Transmitter code | Upload as-is (no changes) |

| `ESP32_LoRa_Receiver.ino` | Receiver code | Add WiFi + Supabase credentials |The guide includes:- **Responsive Design**: Works on desktop, tablet, and mobile

| `fix_database_schema.sql` | Fix UUID→VARCHAR migration | Run if sensor_id errors |

| `frontend/env-config.js` | Frontend config | Add Supabase URL + anon key |- ✅ Supabase backend setup (15 min)

| `frontend/server.js` | Dev server | Run with `node server.js` |

- ✅ Frontend configuration (5 min)### 🔌 ESP32 Integration

---

- ✅ ESP32 hardware setup (20 min)- **Direct Database Connection**: ESP32 → Supabase → Dashboard

## 🛠️ Hardware Requirements

- ✅ Testing & verification (5 min)- **Real-time Updates**: Instant data reflection across all clients

**Per ESP32 Setup:**

- 1× ESP32 Dev Board (₹300-500)- **Multiple Sensor Support**: Unlimited sensor connections

- 1× LoRa RA-02 Module - 433MHz (₹350-450)

- Jumper wires### ⚡ Quick Test (No Hardware)- **Flexible Data Types**: Support for various sensor readings

- USB cable

- **Status Monitoring**: Online/offline sensor detection

**Total System:**

- 2× ESP32 boards1. **Setup Supabase** (follow guide)

- 2× LoRa RA-02 modules

- WiFi network (for receiver only)2. **Configure frontend**:### 🎨 Modern UI/UX

- Supabase account (free tier)

   ```bash- **TailwindCSS Styling**: Clean, professional design

**Wiring (same for both):**

```   cd frontend- **Vibrant Color Scheme**: Water-themed gradient colors

ESP32      LoRa RA-02

-----      ----------   # Edit env-config.js with your Supabase credentials- **Responsive Layout**: Mobile-first design approach

3.3V   →   VCC (⚠️ NOT 5V!)

GND    →   GND   node server.js- **Loading States**: Smooth user experience

GPIO5  →   NSS

GPIO14 →   RST   ```- **Error Handling**: Graceful error messages and recovery

GPIO2  →   DIO0

GPIO18 →   SCK3. **Open browser**: http://localhost:5000

GPIO19 →   MISO

GPIO23 →   MOSI## 🚀 Quick Start

```

## 🏗️ Architecture

---

### Prerequisites

## 🚀 Features

```- Node.js 16+ (for development)

### LoRa Communication

- ✅ 433MHz ISM band┌─────────────────┐- Supabase account

- ✅ Spreading Factor 12 (long range mode)

- ✅ ~5-10 km range (line of sight)│  ESP32 Receiver │  ← WiFi → Supabase PostgreSQL- Modern web browser

- ✅ Low power consumption

- ✅ Sequential data: 100.1 → 200.1 (auto-resets)│  (Test Mode)    │              ↓- ESP32 device (optional, for hardware integration)



### Cloud Backend (Supabase)│  Auto-generates │           Real-time

- ✅ PostgreSQL database

- ✅ Real-time subscriptions (WebSocket)│  data for ALL   │           WebSocket### 1. Clone and Setup

- ✅ REST API for data insertion

- ✅ Free tier: 500MB storage (~500k readings)│  4 locations    │              ↓



### Dashboard└─────────────────┘         Dashboard```bash

- ✅ Interactive map (MapLibre GL)

- ✅ Street / Satellite view toggle                            (MapLibre GL)git clone <repository-url>

- ✅ 4 location markers

- ✅ Real-time charts (auto-update)```cd WaterDashboard

- ✅ Historical data trends

- ✅ Mobile responsivenpm install



---### Test Mode Features```



## 📊 Data Format



**Sender transmits:**- 🔄 **Auto-generates** realistic sensor data### 2. Environment Configuration

```

LOC:ukkadam,PH:100.1,TURB:100.1,TEMP:100.1,TDS:100.1- 📍 **All 4 villages** populated from single ESP32

```

- ⏱️ **60-second intervals** (configurable)Create a `.env` file:

**Receiver parses into:**

- `location`: "ukkadam"- 📊 **Realistic ranges**: pH 6.5-8.5, Turbidity 10-40 NTU, etc.

- `sensor_id`: "ukkadam_ph", "ukkadam_turbidity", etc.

- `value`: 100.1, 100.1, 100.1, 100.1```env

- `rssi`: -45 (signal strength)

## 📁 Project StructureSUPABASE_URL=your_supabase_project_url

**Supabase stores:**

| sensor_id | value | rssi | timestamp |SUPABASE_ANON_KEY=your_supabase_anon_key

|-----------|-------|------|-----------|

| ukkadam_ph | 100.1 | -45 | 2025-10-23 10:30:00 |``````

| ukkadam_turbidity | 100.1 | -45 | 2025-10-23 10:30:01 |

WATER/

---

├── COMPLETE_SETUP_GUIDE.md       ← START HERE!### 3. Supabase Database Setup

## ⚡ Quick Commands

├── ESP32_Water_Monitor_Test.ino  ← Upload to ESP32

**Start Dashboard:**

```bash├── ESP32_Sensor_Transmitter.ino  ← Optional: Real sensorsRun this SQL in your Supabase SQL editor:

cd frontend

node server.js├── generate_test_data.sql        ← Manual SQL testing

```

├── frontend/```sql

**Check Supabase Data:**

```sql│   ├── index.html               ← Main map interface-- Create sensor_data table

SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 10;

```│   ├── location.html            ← Location dashboardCREATE TABLE sensor_data (



**Verify Function Exists:**│   ├── map.js                   ← Map controls    id SERIAL PRIMARY KEY,

```sql

SELECT routine_name FROM information_schema.routines WHERE routine_name = 'insert_reading';│   ├── location.js              ← Charts & real-time updates    sensor_id VARCHAR(50) NOT NULL,

```

│   ├── data.js                  ← Location data    name VARCHAR(100),

**Fix Database Schema:**

```bash│   ├── auth.js                  ← Session management    latitude DECIMAL(10, 8) NOT NULL,

# Copy contents of fix_database_schema.sql

# Paste in Supabase SQL Editor → RUN│   ├── env-config.js            ← Supabase credentials    longitude DECIMAL(11, 8) NOT NULL,

```

│   └── server.js                ← Dev server (port 5000)    value DECIMAL(10, 4) NOT NULL,

---

└── backend/    unit VARCHAR(20) DEFAULT 'ppm',

## 🐛 Common Issues

    └── src/index.js             ← Optional backend logic    status VARCHAR(20) DEFAULT 'active',

| Problem | Solution |

|---------|----------|```    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

| LoRa init failed | Check wiring (VCC to 3.3V NOT 5V!) |

| WiFi won't connect | Use 2.4GHz network, check SSID/password |    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

| HTTP 400 error | Run `fix_database_schema.sql` in Supabase |

| No data in dashboard | Verify `env-config.js` has correct credentials |## 🛠️ Tech Stack);

| Dashboard not updating | Enable real-time: `ALTER PUBLICATION supabase_realtime ADD TABLE sensor_readings;` |



---

| Component | Technology |-- Enable Row Level Security

## 📈 Expected Results

|-----------|-----------|ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;

**After 80 seconds:**

- ✅ All 4 locations have data| **Frontend** | MapLibre GL JS, Tailwind CSS |

- ✅ 16 total readings (4 locations × 4 sensors)

- ✅ Dashboard shows live charts| **Backend** | Supabase (PostgreSQL + Real-time) |-- Create policies

- ✅ Values increment: 100.1 → 101.1 → 102.1...

| **Hardware** | ESP32 + LoRa RA-02 (866MHz) |CREATE POLICY "Users can view sensor data" ON sensor_data

**After 1 hour:**

- ✅ 720 readings| **Mapping** | OpenStreetMap, ESRI Satellite |    FOR SELECT USING (auth.role() = 'authenticated');

- ✅ Historical trend graphs populated

- ✅ Real-time still working| **Communication** | LoRa (SF12, 125kHz BW) |



---| **Data** | REST API + WebSocket subscriptions |CREATE POLICY "Users can insert sensor data" ON sensor_data



## 🎓 Tech Stack    FOR INSERT WITH CHECK (auth.role() = 'authenticated');



| Layer | Technology |## 🎯 Features

|-------|-----------|

| **Hardware** | ESP32, LoRa RA-02 (SX1278, 433MHz) |-- Enable realtime

| **Communication** | LoRa (SF12, 62.5kHz BW, CR4/8) |

| **Backend** | Supabase (PostgreSQL + Real-time) |### Interactive MapALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;

| **Frontend** | MapLibre GL JS, Tailwind CSS |

| **Data** | REST API + WebSocket subscriptions |- ✅ Street / Satellite view toggle```



---- ✅ 4 village markers with real-time status



## 📞 Support- ✅ KML/GeoJSON file upload### 4. Update Configuration



- 📘 **Setup Guide**: `COMPLETE_SETUP_GUIDE.md`- ✅ Click markers → Location dashboard

- 🔗 **Supabase Docs**: https://supabase.com/docs

- 🔗 **LoRa Library**: https://github.com/sandeepmistry/arduino-LoRaEdit `config.js` with your Supabase credentials:

- 🔗 **MapLibre**: https://maplibre.org/

### Location Dashboards

---

- ✅ Real-time sensor charts```javascript

## ✅ Checklist

- ✅ Historical data trendsthis.supabase = {

- [ ] Read `COMPLETE_SETUP_GUIDE.md`

- [ ] Wire 2× ESP32 + LoRa modules- ✅ Auto-refresh (no page reload)    url: 'YOUR_SUPABASE_URL',

- [ ] Upload `ESP32_LoRa_Sender.ino`

- [ ] Update & upload `ESP32_LoRa_Receiver.ino`- ✅ Water quality alerts    anonKey: 'YOUR_SUPABASE_ANON_KEY'

- [ ] Configure `frontend/env-config.js`

- [ ] Run `node server.js`};

- [ ] Verify Supabase has data

- [ ] Check dashboard at http://localhost:5000### ESP32 System```



**🎉 System operational!** Sender transmits → Receiver uploads → Dashboard updates in real-time.- ✅ **Test Mode**: Auto-generates data for all villages


- ✅ **Receiver Mode**: Accepts LoRa packets### 5. Development Server

- ✅ WiFi → Supabase direct upload

- ✅ RSSI signal strength monitoring```bash

npm run dev

## 📡 LoRa Configuration# or

npx live-server --port=3000

```cpp```

Frequency: 866 MHz (India ISM band)

Spreading Factor: 12 (max range)Visit `http://localhost:3000` to see your dashboard!

Bandwidth: 125 kHz

Coding Rate: 4/8## 📁 Project Structure

Sync Word: 0x12

Range: ~5-10 km (line of sight)```

```WaterDashboard/

├── index.html          # Main dashboard page

## 🔧 Configuration├── login.html          # Authentication page

├── location.html       # Individual sensor dashboard

### Enable/Disable Test Mode├── config.js           # Application configuration

├── auth.js            # Authentication management

In `ESP32_Water_Monitor_Test.ino`:├── map.js             # MapLibre GL JS integration

```cpp├── data.js            # Supabase data management

#define TEST_MODE true   // false = use real LoRa transmitter├── location.js        # Location dashboard functionality

#define TEST_INTERVAL 60000  // milliseconds (60s)├── package.json       # Dependencies and scripts

```├── netlify.toml       # Netlify deployment config

├── vercel.json        # Vercel deployment config

### Adjust Data Frequency├── .env.example       # Environment variables template

└── ESP32_INTEGRATION.md # Hardware integration guide

```cpp```

#define TEST_INTERVAL 30000   // 30 seconds (faster)

#define TEST_INTERVAL 120000  // 2 minutes (slower)## 🌐 Deployment

```

### Option 1: Netlify Deployment

## 📈 Database Schema

1. **Connect Repository**

```sql   ```bash

locations (4 rows)   # Install Netlify CLI

  ↓   npm install -g netlify-cli

sensors (16 rows - 4 per location)   

  ↓   # Deploy

sensor_readings (time-series data)   netlify deploy --prod --dir .

  ↓   ```

alerts (threshold violations)

```2. **Environment Variables**

   - Go to Netlify dashboard → Site settings → Environment variables

## 🐛 Troubleshooting   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`



See **Troubleshooting** section in [COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md)3. **Custom Domain** (Optional)

   - Add your domain in Netlify dashboard

Common issues:   - Configure DNS settings

- ❌ WiFi won't connect → Check SSID/password (case-sensitive!)

- ❌ Data not in Supabase → Verify `insert_reading` function exists### Option 2: Vercel Deployment

- ❌ Dashboard not updating → Check browser console (F12)

- ❌ LoRa init failed → Verify wiring (VCC to 3.3V, NOT 5V!)1. **Install Vercel CLI**

   ```bash

## 💰 Cost Estimate   npm install -g vercel

   vercel

| Item | Cost (INR) |   ```

|------|------------|

| ESP32 Dev Board | ₹300-500 |2. **Environment Variables**

| LoRa RA-02 Module | ₹350-450 |   ```bash

| Supabase (Free Tier) | ₹0/month |   vercel env add SUPABASE_URL

| **Total** | **₹650-950** |   vercel env add SUPABASE_ANON_KEY

   ```

**Free Tier Limits:**

- 500MB database = ~500,000 readings3. **Deploy**

- 34+ days of continuous operation   ```bash

- 2GB bandwidth/month   vercel --prod

   ```

## 🔐 Security

### Option 3: Manual Deployment

- ✅ Session-based authentication

- ✅ Supabase Row Level Security (RLS)1. Upload all files to your web server

- ✅ API keys in environment config2. Configure environment variables in `config.js`

- ⚠️ Don't commit credentials to Git!3. Ensure HTTPS is enabled

4. Test authentication and real-time features

## 📞 Support

## 🔧 ESP32 Integration

### Documentation

- 📘 [Complete Setup Guide](./COMPLETE_SETUP_GUIDE.md)### Hardware Setup

- 🔗 [Supabase Docs](https://supabase.com/docs)

- 🔗 [LoRa Library](https://github.com/sandeepmistry/arduino-LoRa)1. **Required Components**

- 🔗 [MapLibre GL JS](https://maplibre.org/)   - ESP32 development board

   - Water quality sensor (pH, TDS, turbidity, etc.)

### Hardware Specs   - Breadboard and jumper wires

- ESP32: WiFi 802.11 b/g/n, dual-core 240MHz   - Power supply

- LoRa RA-02: SX1278 chipset, 866MHz ISM band

2. **Wiring Example**

## 📜 License   ```

   ESP32    →    Sensor

MIT License - See LICENSE file for details   3.3V     →    VCC

   GND      →    GND

---   GPIO36   →    Analog Out

   ```

## ✅ Setup Checklist

### Software Setup

- [ ] Read `COMPLETE_SETUP_GUIDE.md`

- [ ] Create Supabase account1. **Install Libraries**

- [ ] Run SQL schema   - WiFi (built-in)

- [ ] Update `frontend/env-config.js`   - HTTPClient (built-in)

- [ ] Start frontend server   - ArduinoJson

- [ ] Configure ESP32 code

- [ ] Upload to ESP322. **Upload Code**

- [ ] Verify data in Supabase   - See `ESP32_INTEGRATION.md` for complete code

- [ ] Check dashboard updates   - Update WiFi credentials and Supabase config

   - Flash to ESP32

**🎉 Need help?** Open an issue or check the troubleshooting guide!

3. **Test Connection**

---   - Monitor serial output

   - Check data appears in dashboard

**Current Status**: ✅ Test mode operational | 📡 Ready for deployment | 🌊 Monitoring 4 locations   - Verify real-time updates


## 📊 Usage Guide

### Dashboard Navigation

1. **Login**: Use email/password authentication
2. **Map View**: 
   - Toggle between street and satellite views
   - Click markers for detailed sensor info
   - Upload KML/GeoJSON overlays
   - Apply data filters

3. **Sensor Details**:
   - Click any marker to open location dashboard
   - View real-time charts and historical data
   - Export data as CSV
   - Monitor sensor status

### Data Management

- **Real-time Updates**: Data refreshes automatically every 30 seconds
- **Historical Data**: Access up to 30 days of sensor readings
- **Export Options**: Download CSV files for analysis
- **Filter Controls**: Filter by value range and time period

## 🎨 Customization

### Styling

The application uses TailwindCSS with custom water-themed colors:

```css
--water-blue: #0ea5e9
--water-cyan: #06b6d4
--water-teal: #0d9488
```

### Map Styles

Update map styles in `config.js`:

```javascript
styles: {
    street: 'https://your-custom-style.json',
    satellite: 'https://your-satellite-style.json'
}
```

### Sensor Types

Add new sensor types by updating the data processing functions in `data.js`.

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Problems**
   - Check Supabase URL and API key
   - Verify email confirmation
   - Clear browser cache

2. **Map Not Loading**
   - Check internet connection
   - Verify MapLibre GL JS CDN
   - Check browser console for errors

3. **Real-time Updates Not Working**
   - Ensure Supabase Realtime is enabled
   - Check WebSocket connection
   - Verify database policies

4. **ESP32 Connection Issues**
   - Check WiFi credentials
   - Verify Supabase endpoint
   - Monitor serial output for errors

### Debug Mode

Enable debug logging by adding to `config.js`:

```javascript
debug: true
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the wiki for detailed guides
- **Issues**: Report bugs via GitHub issues
- **Community**: Join our Discord server
- **Email**: support@waterdashboard.com

## 🔮 Roadmap

### Version 1.1
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Alert system for threshold violations
- [ ] Multi-tenant support

### Version 1.2
- [ ] Machine learning predictions
- [ ] API rate limiting
- [ ] Advanced user roles
- [ ] Data retention policies

### Version 2.0
- [ ] IoT device management
- [ ] Custom report generation
- [ ] Integration with external APIs
- [ ] Advanced mapping features

## 🏆 Acknowledgments

- **MapLibre GL JS** for excellent mapping capabilities
- **Supabase** for backend-as-a-service
- **TailwindCSS** for utility-first styling
- **Chart.js** for data visualization
- **Font Awesome** for icons

---

**Made with 💧 for water monitoring enthusiasts**
