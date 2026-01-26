// ============================================
// ESP32 Direct WiFi Water Monitor - Salem District
// Compatible with Many-to-Many Device-Location System
// ============================================
// KML Locations: Salem South, Yercaud, Sankari, Edappadi, Omalur, Mettur
//
// This device:
// 1. Reads sensors directly (no LoRa needed)
// 2. Posts to Supabase via WiFi
// 3. Supports single or multiple location linking
// ============================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================
// Configuration
// ============================================
// CHANGE THESE VALUES:
const char* DEVICE_ID = "ESP32_001";        // Your unique device ID
const char* LOCATION_NAME = "";             // Leave empty for auto-assign, or set to "Salem South", "Yercaud", etc.

const char* ssid = "Dharani";
const char* password = "ABCDEFGH";

const char* supabaseUrl = "https://uvqcctheqvuilwfbpqcd.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cWNjdGhlcXZ1aWx3ZmJwcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDA0NDgsImV4cCI6MjA3NjcxNjQ0OH0.BDPOk3CicghYD18lqRCvITbLyHKLP_mQWtprXrkXphs";

// Sensor Pins (CHANGE THESE TO YOUR ACTUAL PINS)
#define PH_PIN 34       // Analog pin for pH sensor
#define TURB_PIN 35     // Analog pin for turbidity sensor
#define TEMP_PIN 32     // Analog pin for temperature sensor
#define TDS_PIN 33      // Analog pin for TDS sensor

// Reading interval
const unsigned long SEND_INTERVAL = 60000;  // Send every 60 seconds
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("\n╔══════════════════════════════════════════════╗");
  Serial.println("║  ESP32 Water Monitor - Salem District       ║");
  Serial.println("║  Direct WiFi Upload                         ║");
  Serial.println("╚══════════════════════════════════════════════╝\n");

  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);
  
  if (strlen(LOCATION_NAME) > 0) {
    Serial.print("Location: ");
    Serial.println(LOCATION_NAME);
  } else {
    Serial.println("Location: Auto-assigned");
  }
  Serial.println();

  // Connect to WiFi
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
    while (1);
  }

  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Signal Strength: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm\n");

  // Initialize sensor pins
  pinMode(PH_PIN, INPUT);
  pinMode(TURB_PIN, INPUT);
  pinMode(TEMP_PIN, INPUT);
  pinMode(TDS_PIN, INPUT);

  Serial.println("📍 Supported Locations:");
  Serial.println("  • Salem South");
  Serial.println("  • Yercaud");
  Serial.println("  • Sankari");
  Serial.println("  • Edappadi");
  Serial.println("  • Omalur");
  Serial.println("  • Mettur");
  Serial.println("\n✅ System Ready - Starting sensor readings...\n");
  
  lastSendTime = millis();
}

void loop() {
  int packetSize = LoRa.parsePacket();
  
  if (packetSize > 0) {
    // Read the packet
    String received = "";
    while (LoRa.available()) {
      received += (char)LoRa.read();
    }
    
    int rssi = LoRa.packetRssi();
    float snr = LoRa.packetSnr();

    Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.println("📩 LoRa Packet Received");
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.print("Data: ");
    Serial.println(received);
    Serial.print("RSSI: ");
    Serial.print(rssi);
    Serial.println(" dBm");
    Serial.print("SNR:  ");
    Serial.print(snr);
    Serial.println(" dB\n");

    // Parse and send to Supabase
    parseAndSendData(received, rssi);
  }
}

// ============================================
// Parse LoRa Packet and Send to Supabase
// ============================================
void parseAndSendData(String data, int rssi) {
  // Expected formats:
  // 1. "DEVICE:ESP32_001,PH:7.2,TURB:15.3,TEMP:25.1,TDS:350"
  // 2. "DEVICE:ESP32_001,LOC:Salem South,PH:7.2,TURB:15.3"

  // Extract device identifier
  int deviceIndex = data.indexOf("DEVICE:");
  if (deviceIndex < 0) {
    Serial.println("⚠️  Error: No device identifier found!");
    Serial.println("Expected format: DEVICE:ESP32_001,PH:7.5,TURB:15.3,...");
    Serial.println("Or: DEVICE:ESP32_001,LOC:Salem South,PH:7.5,...\n");
    return;
  }

  int firstComma = data.indexOf(",", deviceIndex);
  if (firstComma < 0) {
    Serial.println("⚠️  Error: Invalid packet format!\n");
    return;
  }

  String deviceId = data.substring(deviceIndex + 7, firstComma);
  deviceId.trim();

  Serial.print("🔧 Device ID: ");
  Serial.println(deviceId);

  // Check for optional location
  String location = "";
  int locIndex = data.indexOf("LOC:");
  if (locIndex >= 0) {
    int locEnd = data.indexOf(",", locIndex);
    if (locEnd > 0) {
      location = data.substring(locIndex + 4, locEnd);
      location.trim();
      Serial.print("📍 Location: ");
      Serial.println(location);
    }
  } else {
    Serial.println("📍 Location: Auto-assigned (device linked to 1 location)");
  }

  Serial.println("Parsing sensors...");

  int successCount = 0;

  // Parse pH
  if (data.indexOf("PH:") >= 0) {
    float value = extractValue(data, "PH:");
    if (sendToSupabase(deviceId, location, "ph_sensor", value, "pH", rssi)) {
      Serial.print("  ✓ pH: ");
      Serial.println(value, 2);
      successCount++;
    }
  }

  // Parse Turbidity
  if (data.indexOf("TURB:") >= 0) {
    float value = extractValue(data, "TURB:");
    if (sendToSupabase(deviceId, location, "turbidity_sensor", value, "NTU", rssi)) {
      Serial.print("  ✓ Turbidity: ");
      Serial.print(value, 2);
      Serial.println(" NTU");
      successCount++;
    }
  }

  // Parse Temperature
  if (data.indexOf("TEMP:") >= 0) {
    float value = extractValue(data, "TEMP:");
    if (sendToSupabase(deviceId, location, "temp_sensor", value, "°C", rssi)) {
      Serial.print("  ✓ Temperature: ");
      Serial.print(value, 2);
      Serial.println(" °C");
      successCount++;
    }
  }

  // Parse TDS
  if (data.indexOf("TDS:") >= 0) {
    float value = extractValue(data, "TDS:");
    if (sendToSupabase(deviceId, location, "tds_sensor", value, "ppm", rssi)) {
      Serial.print("  ✓ TDS: ");
      Serial.print(value, 2);
      Serial.println(" ppm");
      successCount++;
    }
  }

  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.print("✅ ");
  Serial.print(successCount);
  Serial.println(" sensors uploaded successfully\n");
}

// ============================================
// Extract Numeric Value from String
// ============================================
float extractValue(String data, String key) {
  int startIndex = data.indexOf(key);
  if (startIndex < 0) return 0;

  startIndex += key.length();
  int endIndex = data.indexOf(",", startIndex);

  if (endIndex < 0) {
    endIndex = data.length();
  }

  String valueStr = data.substring(startIndex, endIndex);
  valueStr.trim();
  return valueStr.toFloat();
}

// ============================================
// Send Data to Supabase - NEW SYSTEM
// ============================================
bool sendToSupabase(String deviceId, String location, String sensorId, float value, String unit, int rssi) {
  // Check WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("  ⚠️  WiFi disconnected! Reconnecting...");
    WiFi.begin(ssid, password);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 10) {
      delay(500);
      attempts++;
    }
    
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("  ❌ WiFi reconnection failed!");
      return false;
    }
  }

  HTTPClient http;

  // POST directly to sensor_readings table
  String url = String(supabaseUrl) + "/rest/v1/sensor_readings";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.addHeader("Prefer", "return=minimal");  // Don't return inserted row
  http.setTimeout(10000);

  // Build JSON payload
  // Trigger will auto-populate location_id from device_identifier
  StaticJsonDocument<256> doc;
  doc["device_identifier"] = deviceId;
  doc["sensor_id"] = sensorId;
  doc["value"] = value;
  doc["unit"] = unit;
  
  // Only include location_name if provided (for multi-location devices)
  if (location.length() > 0) {
    doc["location_name"] = location;
  }

  String payload;
  serializeJson(doc, payload);

  Serial.print("  📤 Payload: ");
  Serial.println(payload);

  // Send POST request
  int httpCode = http.POST(payload);

  bool success = false;
  if (httpCode == 200 || httpCode == 201 || httpCode == 204) {
    success = true;
    Serial.println("  ✅ Posted to Supabase");
  } else if (httpCode > 0) {
    Serial.print("  ⚠️  HTTP ");
    Serial.print(httpCode);
    Serial.print(": ");
    Serial.println(http.getString());
  } else {
    Serial.print("  ❌ Connection error: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
  return success;
}
