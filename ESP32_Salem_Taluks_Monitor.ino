#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================
// WiFi Configuration
// ============================================
const char* ssid = "Dharani";
const char* password = "ABCDEFGH";

// ============================================
// Supabase Configuration
// ============================================
const char* supabaseUrl = "https://uvqcctheqvuilwfbpqcd.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cWNjdGhlcXZ1aWx3ZmJwcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDA0NDgsImV4cCI6MjA3NjcxNjQ0OH0.BDPOk3CicghYD18lqRCvITbLyHKLP_mQWtprXrkXphs";

// ============================================
// Device Authentication
// ============================================
const char* DEVICE_ID = "SALEM_ESP32_001";        // Change this for each device
const char* DEVICE_PASSWORD = "salem@2026";       // Change this for each device

// ============================================
// 6 Salem Taluks Location IDs (matching KML markers)
// ============================================
const char* locationIDs[] = {
  "salemsouth",
  "yercaud",
  "sankari",
  "edappadi",
  "omalur",
  "mettur"
};

const int numLocations = 6;
int currentLocation = 0;
unsigned long lastTransmission = 0;
const unsigned long transmissionInterval = 20000; // 20 seconds

// ============================================
// Setup
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║  ESP32 Salem Taluks Water Monitor     ║");
  Serial.println("║  Direct WiFi → Supabase Integration   ║");
  Serial.println("╚════════════════════════════════════════╝\n");

  // Connect to WiFi
  connectWiFi();

  Serial.println("\n✅ System Ready - Starting data transmission...\n");
}

// ============================================
// Main Loop
// ============================================
void loop() {
  unsigned long currentMillis = millis();

  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi disconnected! Reconnecting...");
    connectWiFi();
  }

  // Send data every 20 seconds
  if (currentMillis - lastTransmission >= transmissionInterval) {
    lastTransmission = currentMillis;
    
    // Get current location ID
    const char* locationID = locationIDs[currentLocation];
    
    Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.print("📡 Transmitting [");
    Serial.print(currentLocation + 1);
    Serial.print("/");
    Serial.print(numLocations);
    Serial.println("]");
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.print("📍 Location ID: ");
    Serial.println(locationID);
    
    // Generate realistic sensor values
    float ph = generateRealisticPH();
    float turbidity = generateRealisticTurbidity();
    float temperature = generateRealisticTemperature();
    float tds = generateRealisticTDS();
    
    Serial.println("\n📊 Sensor Readings:");
    Serial.print("  pH:          ");
    Serial.println(ph, 2);
    Serial.print("  Turbidity:   ");
    Serial.print(turbidity, 2);
    Serial.println(" NTU");
    Serial.print("  Temperature: ");
    Serial.print(temperature, 2);
    Serial.println(" °C");
    Serial.print("  TDS:         ");
    Serial.print(tds, 0);
    Serial.println(" ppm\n");
    
    // Send all sensor data
    int successCount = 0;
    if (sendSensorData(locationID, "ph", ph)) successCount++;
    if (sendSensorData(locationID, "turbidity", turbidity)) successCount++;
    if (sendSensorData(locationID, "temperature", temperature)) successCount++;
    if (sendSensorData(locationID, "tds", tds)) successCount++;
    
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.print("✅ ");
    Serial.print(successCount);
    Serial.println(" sensors uploaded successfully\n");
    
    // Move to next location
    currentLocation = (currentLocation + 1) % numLocations;
  }
}

// ============================================
// Connect to WiFi
// ============================================
void connectWiFi() {
  Serial.print("🌐 Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n❌ WiFi connection failed!");
    Serial.println("Check SSID and password, then restart.");
    delay(5000);
    ESP.restart();
  }

  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Signal Strength: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm\n");
}



// ============================================
// Send Sensor Data to Supabase
// ============================================
bool sendSensorData(const char* locationID, const char* sensorType, float value) {
  HTTPClient http;
  
  // Build sensor_id (e.g., "salemsouth_ph")
  String sensorId = String(locationID) + "_" + String(sensorType);
  
  // Direct table INSERT (bypasses function overloading issues)
  String url = String(supabaseUrl) + "/rest/v1/sensor_readings";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.addHeader("Prefer", "return=minimal");
  http.setTimeout(10000);

  // Build JSON payload for direct table insert
  String payload = "{\"sensor_id\":\"" + sensorId + 
                   "\",\"value\":" + String(value, 2) + 
                   ",\"rssi\":" + String(WiFi.RSSI()) + 
                   ",\"device_identifier\":\"" + String(DEVICE_ID) + "\"}";

  // Send POST request
  int httpCode = http.POST(payload);

  bool success = false;
  if (httpCode == 200 || httpCode == 201 || httpCode == 204) {
    Serial.print("  ✓ ");
    Serial.print(sensorType);
    Serial.println(" uploaded");
    success = true;
  } else if (httpCode > 0) {
    Serial.print("  ⚠️  ");
    Serial.print(sensorType);
    Serial.print(" failed - HTTP ");
    Serial.print(httpCode);
    Serial.print(": ");
    Serial.println(http.getString());
  } else {
    Serial.print("  ❌ ");
    Serial.print(sensorType);
    Serial.print(" error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return success;
}

// ============================================
// Generate Realistic Sensor Values
// ============================================
float generateRealisticPH() {
  // pH: 6.1 - 9.2 (slightly alkaline for Tamil Nadu water)
  return random(610, 921) / 100.0;
}

float generateRealisticTurbidity() {
  // Turbidity: 0 - 5 NTU (low to moderate)
  return random(0, 501) / 100.0;
}

float generateRealisticTemperature() {
  // Temperature: 22 - 32 °C (Tamil Nadu climate)
  return random(2200, 3201) / 100.0;
}

float generateRealisticTDS() {
  // TDS: 150 - 2000 ppm (fresh to slightly brackish)
  return random(150, 2001);
}
