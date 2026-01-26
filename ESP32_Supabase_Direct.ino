/*
 * ESP32 to Supabase Direct Connection - FULLY AUTOMATED
 * 
 * This code works with ANY KML file uploaded to the dashboard!
 * Just send GPS coordinates - dashboard automatically matches to KML boundaries.
 * 
 * Change KML file = No code changes needed!
 * Add new villages = No code changes needed!
 * Update boundaries = No code changes needed!
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==================== WiFi Configuration ====================
const char* ssid = "Dharani";           // Your WiFi name
const char* password = "ABCDEFGH";      // Your WiFi password


// ==================== Supabase Configuration ====================
// Supabase
const char* supabaseUrl = "https://uvqcctheqvuilwfbpqcd.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cWNjdGhlcXZ1aWx3ZmJwcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDA0NDgsImV4cCI6MjA3NjcxNjQ0OH0.BDPOk3CicghYD18lqRCvITbLyHKLP_mQWtprXrkXphs";
              // Replace with your Supabase anon key
const char* tableName = "sensor_readings";                       // Table name in Supabase

// ==================== Device Configuration ====================
// Device
const char* deviceId = "ESP32-SALEM-001";        // Match your device ID
const char* deviceName = "Salem Water Monitor";   // Display name
// ==================== GPS Configuration ====================
// Method 1: Fixed Location (for static installation)
float currentLatitude = 11.4102;               // Set your device's GPS latitude
float currentLongitude = 77.7197;              // Set your device's GPS longitude

// Method 2: GPS Module (uncomment if using GPS module)
// #include <TinyGPS++.h>
// TinyGPSPlus gps;
// HardwareSerial gpsSerial(2); // RX=16, TX=17

// Method 3: Random Testing (comment out for production)
#define USE_RANDOM_GPS true                    // Set to false for fixed location
float gpsRandomRange = 0.01;                   // ±0.01 degrees (~1.1km variation)

// ==================== LED Configuration ====================
#define LED_PIN 2               // Built-in LED for status

// ==================== Timing Configuration ====================
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 15000;  // Send data every 15 seconds

// ==================== Function Declarations ====================
void connectWiFi();
bool sendToSupabase(String jsonData);
String generateSensorData();
void getGPSCoordinates(float &lat, float &lon);

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize random seed
  randomSeed(analogRead(0));
  
  Serial.println("\n\n╔════════════════════════════════════════╗");
  Serial.println("║  ESP32 → Supabase → KML Dashboard     ║");
  Serial.println("║  FULLY AUTOMATED - Works with ANY KML ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  // Initialize GPS (if using GPS module)
  // gpsSerial.begin(9600, SERIAL_8N1, 16, 17);
  
  // Connect to WiFi
  connectWiFi();
  
  Serial.println("✅ Setup complete! Starting data transmission...\n");
  Serial.println("📍 Sending GPS coordinates + sensor data");
  Serial.println("🗺️  Dashboard will automatically match to uploaded KML\n");
  Serial.println("💡 Change KML file = Zero code changes needed!\n");
  delay(2000);
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectWiFi();
  }
  
  // Check if it's time to send data
  if (millis() - lastSendTime >= sendInterval) {
    digitalWrite(LED_PIN, HIGH);  // LED on while transmitting
    
    Serial.println("\n========================================");
    Serial.println("📡 Transmitting Data to Supabase");
    Serial.println("========================================");
    
    String jsonData = generateSensorData();
    
    Serial.println("\n--- Sending to Supabase ---");
    bool success = sendToSupabase(jsonData);
    
    if (success) {
      Serial.println("✓ Data sent successfully!\n");
    } else {
      Serial.println("✗ Failed to send data\n");
    }
    
    digitalWrite(LED_PIN, LOW);  // LED off
    lastSendTime = millis();
  }
  
  delay(100);
}

// ==================== WiFi Connection ====================
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
    Serial.println("Please check your WiFi credentials.");
  }
}

// ==================== Generate Random Sensor Data ====================
String generateSensorData() {
  // Create JSON document
  StaticJsonDocument<512> doc;
  
  // Get GPS coordinates (automatically handles fixed or random mode)
  float lat, lon;
  getGPSCoordinates(lat, lon);
  
  // Location name will be automatically determined by KML boundaries on dashboard
  // Just send coordinates - dashboard will match to KML regions
  
  // pH: 6.1 - 9.2
  float phValue = random(610, 921) / 100.0;
  
  // Turbidity: 0 - 5 NTU (low values for clean water)
  float turbidity = random(0, 501) / 100.0;
  
  // Temperature: 18 - 27 °C
  float temperature = random(1800, 2701) / 100.0;
  
  // TDS: 150 - 2000 ppm
  int tds = random(150, 2001);
  
  // Water Level: 20 - 90 cm
  float waterLevel = random(2000, 9001) / 100.0;
  
  // Flow Rate: 5 - 45 L/min
  float flowRate = random(500, 4501) / 100.0;
  
  // Add device information
  doc["device_id"] = deviceId;
  doc["device_name"] = deviceName;
  
  // Add GPS coordinates - Dashboard will automatically match to KML boundaries!
  doc["latitude"] = lat;
  doc["longitude"] = lon;
  
  // Add sensor readings
  doc["water_level"] = waterLevel;
  doc["flow_rate"] = flowRate;
  doc["ph"] = phValue;
  doc["turbidity"] = turbidity;
  doc["temperature"] = temperature;
  doc["tds"] = tds;
  
  // Calculate water quality status
  String status = "Good";
  if (phValue < 6.5 || phValue > 8.5 || turbidity > 3.0 || tds > 1500) {
    status = "Warning";
  }
  if (phValue < 6.0 || phValue > 9.0 || turbidity > 5.0 || tds > 1800) {
    status = "Critical";
  }
  doc["status"] = status;
  
  // Serialize to JSON string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Print readings to Serial
  Serial.println("📊 Generated Sensor Readings:");
  Serial.printf("   📍 GPS: %.6f, %.6f\n", lat, lon);
  Serial.printf("   💧 Water Level: %.2f cm\n", waterLevel);
  Serial.printf("   🌊 Flow Rate: %.2f L/min\n", flowRate);
  Serial.printf("   🧪 pH: %.2f\n", phValue);
  Serial.printf("   ☁️  Turbidity: %.2f NTU\n", turbidity);
  Serial.printf("   🌡️  Temperature: %.2f °C\n", temperature);
  Serial.printf("   💎 TDS: %d ppm\n", tds);
  Serial.printf("   ✓ Status: %s\n", status.c_str());
  Serial.println("   🗺️  Location: [Auto-detected from KML]");
  
  return jsonString;
}

// ==================== Send Data to Supabase ====================
bool sendToSupabase(String jsonData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected!");
    return false;
  }
  
  HTTPClient http;
  
  // Build REST API URL
  String url = String(supabaseUrl) + "/rest/v1/" + String(tableName);
  
  Serial.print("Posting to: ");
  Serial.println(url);
  
  // Begin HTTP connection
  http.begin(url);
  
  // Set headers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.addHeader("Prefer", "return=minimal");  // Don't return the inserted row
  
  // Send POST request
  int httpResponseCode = http.POST(jsonData);
  
  // Check response
  bool success = false;
  if (httpResponseCode == 200 || httpResponseCode == 201) {
    Serial.print("✓ HTTP Response: ");
    Serial.println(httpResponseCode);
    success = true;
  } else {
    Serial.print("✗ HTTP Error: ");
    Serial.println(httpResponseCode);
    if (httpResponseCode > 0) {
      Serial.println("Response: " + http.getString());
    }
  }
  
  http.end();
  return success;
}

// ==================== GPS Coordinates ====================
void getGPSCoordinates(float &lat, float &lon) {
  #if USE_RANDOM_GPS
    // Random GPS for testing - simulates device movement
    lat = currentLatitude + random(-100, 101) * gpsRandomRange / 100.0;
    lon = currentLongitude + random(-100, 101) * gpsRandomRange / 100.0;
  #else
    // Fixed location
    lat = currentLatitude;
    lon = currentLongitude;
  #endif
  
  // If using GPS module, uncomment below:
  // while (gpsSerial.available() > 0) {
  //   if (gps.encode(gpsSerial.read())) {
  //     if (gps.location.isValid()) {
  //       lat = gps.location.lat();
  //       lon = gps.location.lng();
  //     }
  //   }
  // }
}
