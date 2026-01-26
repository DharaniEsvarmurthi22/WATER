#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_wifi.h>

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
// Device Authentication (PASSWORD-BASED CLAIMING)
// ============================================
// ⚠️ CHANGE THIS SECRET FOR EACH DEVICE! ⚠️
// Users will enter this secret in the dashboard to claim this device
const char* DEVICE_SECRET = "salem@2026";  // Like a password for claiming
const char* DEVICE_ID = "SALEM_ESP32_001"; // Friendly identifier

// ============================================
// 6 Salem Taluks Location IDs
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
const unsigned long transmissionInterval = 20000;

// ============================================
// MAC Address (Auto-populated)
// ============================================
String deviceMacAddress = "";
bool isRegistered = false;

// ============================================
// Setup
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║  ESP32 Salem Password-Based System    ║");
  Serial.println("║  Device Claiming via Dashboard         ║");
  Serial.println("╚════════════════════════════════════════╝\n");

  connectWiFi();
  getDeviceMac();
  registerDevice();

  Serial.println("\n✅ System Ready - Starting data transmission...\n");
}

// ============================================
// Main Loop
// ============================================
void loop() {
  unsigned long currentMillis = millis();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi disconnected! Reconnecting...");
    connectWiFi();
  }

  if (currentMillis - lastTransmission >= transmissionInterval) {
    lastTransmission = currentMillis;
    
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
    
    int successCount = 0;
    if (sendSensorData(locationID, "ph", ph)) successCount++;
    if (sendSensorData(locationID, "turbidity", turbidity)) successCount++;
    if (sendSensorData(locationID, "temperature", temperature)) successCount++;
    if (sendSensorData(locationID, "tds", tds)) successCount++;
    
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.print("✅ ");
    Serial.print(successCount);
    Serial.println(" sensors uploaded successfully\n");
    
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
// Get Device MAC Address
// ============================================
void getDeviceMac() {
  uint8_t mac[6];
  esp_wifi_get_mac(WIFI_IF_STA, mac);
  
  deviceMacAddress = String(mac[0], HEX) + ":" +
                     String(mac[1], HEX) + ":" +
                     String(mac[2], HEX) + ":" +
                     String(mac[3], HEX) + ":" +
                     String(mac[4], HEX) + ":" +
                     String(mac[5], HEX);
  deviceMacAddress.toUpperCase();
  
  Serial.print("🔧 Device MAC: ");
  Serial.println(deviceMacAddress);
  Serial.print("🔐 Device Secret: ");
  Serial.println(DEVICE_SECRET);
  Serial.println();
}

// ============================================
// Register Device (Auto-Registration)
// ============================================
bool registerDevice() {
  Serial.println("📝 Registering device with Supabase...");
  
  HTTPClient http;
  String url = String(supabaseUrl) + "/rest/v1/rpc/register_device";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.setTimeout(15000);

  // Build JSON payload
  StaticJsonDocument<512> doc;
  doc["p_device_secret"] = DEVICE_SECRET;
  doc["p_device_mac"] = deviceMacAddress;
  doc["p_device_name"] = DEVICE_ID;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.print("📤 Sending: ");
  Serial.println(payload);

  int httpCode = http.POST(payload);
  
  if (httpCode == 200 || httpCode == 201 || httpCode == 204) {
    String response = http.getString();
    Serial.println("✅ Device registered successfully!");
    Serial.print("Response: ");
    Serial.println(response);
    isRegistered = true;
  } else if (httpCode > 0) {
    Serial.print("⚠️  Registration returned HTTP ");
    Serial.print(httpCode);
    Serial.print(": ");
    Serial.println(http.getString());
    isRegistered = true; // Assume already registered
  } else {
    Serial.print("❌ Registration error: ");
    Serial.println(http.errorToString(httpCode));
    isRegistered = false;
  }

  http.end();
  return isRegistered;
}

// ============================================
// Send Sensor Data to Supabase
// ============================================
bool sendSensorData(const char* locationID, const char* sensorType, float value) {
  HTTPClient http;
  
  String sensorId = String(locationID) + "_" + String(sensorType);
  String url = String(supabaseUrl) + "/rest/v1/sensor_readings";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.addHeader("Prefer", "return=minimal");
  http.setTimeout(10000);

  // Build JSON payload with device_secret
  StaticJsonDocument<512> doc;
  doc["device_secret"] = DEVICE_SECRET;        // For claiming system
  doc["device_mac"] = deviceMacAddress;
  doc["device_name"] = DEVICE_ID;
  doc["latitude"] = 11.6643;                   // Salem, Tamil Nadu (default)
  doc["longitude"] = 78.1460;
  doc["sensor_id"] = sensorId;
  doc["value"] = value;
  doc["rssi"] = WiFi.RSSI();
  
  // Add sensor-specific fields based on type
  if (strcmp(sensorType, "ph") == 0) {
    doc["ph"] = value;
  } else if (strcmp(sensorType, "turbidity") == 0) {
    doc["turbidity"] = value;
  } else if (strcmp(sensorType, "temperature") == 0) {
    doc["temperature"] = value;
  } else if (strcmp(sensorType, "tds") == 0) {
    doc["tds"] = (int)value;
  }
  
  String payload;
  serializeJson(doc, payload);

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
  return random(610, 921) / 100.0;
}

float generateRealisticTurbidity() {
  return random(0, 501) / 100.0;
}

float generateRealisticTemperature() {
  return random(2200, 3201) / 100.0;
}

float generateRealisticTDS() {
  return random(150, 2001);
}
