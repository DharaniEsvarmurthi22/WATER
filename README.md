# Water Dashboard - Real-time Water Monitoring System

A vibrant, professional web application for real-time water data visualization with ESP32 integration, similar to peopleswaterdata.org but with enhanced features and modern design.

![Water Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Version](https://img.shields.io/badge/Version-1.0.0-orange)

## 🌊 Features

### 🔐 Authentication & Security
- **Secure Login System**: Supabase Auth integration with email/password
- **Protected Routes**: Only authenticated users can access the dashboard
- **Row Level Security**: Database-level access control
- **HTTPS & CORS**: Secure data transmission

### 🗺️ Interactive Mapping
- **MapLibre GL JS**: High-performance vector maps
- **Dual Map Styles**: Street view and satellite imagery toggle
- **Custom Markers**: Real-time sensor location indicators
- **Click-to-Dashboard**: Detailed sensor views on marker click
- **Layer Controls**: Toggle sensors, heatmaps, and overlays
- **File Upload Support**: KML and GeoJSON overlay import
- **External URL Loading**: Load geospatial data from URLs

### 📊 Real-time Data Visualization
- **Live Updates**: WebSocket-based real-time data streaming
- **Interactive Charts**: Historical trends and live readings
- **Statistics Dashboard**: Active sensors, averages, and trends
- **Data Export**: CSV export functionality
- **Responsive Design**: Works on desktop, tablet, and mobile

### 🔌 ESP32 Integration
- **Direct Database Connection**: ESP32 → Supabase → Dashboard
- **Real-time Updates**: Instant data reflection across all clients
- **Multiple Sensor Support**: Unlimited sensor connections
- **Flexible Data Types**: Support for various sensor readings
- **Status Monitoring**: Online/offline sensor detection

### 🎨 Modern UI/UX
- **TailwindCSS Styling**: Clean, professional design
- **Vibrant Color Scheme**: Water-themed gradient colors
- **Responsive Layout**: Mobile-first design approach
- **Loading States**: Smooth user experience
- **Error Handling**: Graceful error messages and recovery

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ (for development)
- Supabase account
- Modern web browser
- ESP32 device (optional, for hardware integration)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd WaterDashboard
npm install
```

### 2. Environment Configuration

Create a `.env` file:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Supabase Database Setup

Run this SQL in your Supabase SQL editor:

```sql
-- Create sensor_data table
CREATE TABLE sensor_data (
    id SERIAL PRIMARY KEY,
    sensor_id VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    value DECIMAL(10, 4) NOT NULL,
    unit VARCHAR(20) DEFAULT 'ppm',
    status VARCHAR(20) DEFAULT 'active',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view sensor data" ON sensor_data
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert sensor data" ON sensor_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;
```

### 4. Update Configuration

Edit `config.js` with your Supabase credentials:

```javascript
this.supabase = {
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

### 5. Development Server

```bash
npm run dev
# or
npx live-server --port=3000
```

Visit `http://localhost:3000` to see your dashboard!

## 📁 Project Structure

```
WaterDashboard/
├── index.html          # Main dashboard page
├── login.html          # Authentication page
├── location.html       # Individual sensor dashboard
├── config.js           # Application configuration
├── auth.js            # Authentication management
├── map.js             # MapLibre GL JS integration
├── data.js            # Supabase data management
├── location.js        # Location dashboard functionality
├── package.json       # Dependencies and scripts
├── netlify.toml       # Netlify deployment config
├── vercel.json        # Vercel deployment config
├── .env.example       # Environment variables template
└── ESP32_INTEGRATION.md # Hardware integration guide
```

## 🌐 Deployment

### Option 1: Netlify Deployment

1. **Connect Repository**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Deploy
   netlify deploy --prod --dir .
   ```

2. **Environment Variables**
   - Go to Netlify dashboard → Site settings → Environment variables
   - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY`

3. **Custom Domain** (Optional)
   - Add your domain in Netlify dashboard
   - Configure DNS settings

### Option 2: Vercel Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Environment Variables**
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_ANON_KEY
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 3: Manual Deployment

1. Upload all files to your web server
2. Configure environment variables in `config.js`
3. Ensure HTTPS is enabled
4. Test authentication and real-time features

## 🔧 ESP32 Integration

### Hardware Setup

1. **Required Components**
   - ESP32 development board
   - Water quality sensor (pH, TDS, turbidity, etc.)
   - Breadboard and jumper wires
   - Power supply

2. **Wiring Example**
   ```
   ESP32    →    Sensor
   3.3V     →    VCC
   GND      →    GND
   GPIO36   →    Analog Out
   ```

### Software Setup

1. **Install Libraries**
   - WiFi (built-in)
   - HTTPClient (built-in)
   - ArduinoJson

2. **Upload Code**
   - See `ESP32_INTEGRATION.md` for complete code
   - Update WiFi credentials and Supabase config
   - Flash to ESP32

3. **Test Connection**
   - Monitor serial output
   - Check data appears in dashboard
   - Verify real-time updates

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
