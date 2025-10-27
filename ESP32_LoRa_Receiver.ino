/*
 * ESP32 LoRa Receiver - Water Quality Monitoring
 * 
 * Hardware: ESP32 + LoRa RA-02 (433MHz)
 * 
 * Wiring:
 * ESP32    LoRa RA-02
 * GPIO5  → NSS
 * GPIO14 → RST
 * GPIO2  → DIO0
 * GPIO18 → SCK
 * GPIO19 → MISO
 * GPIO23 → MOSI
 * 3.3V   → VCC
 * GND    → GND
 * 
 * Functionality:
 * - Receives LoRa packets from sender
 * - Parses location and sensor data from 5 Nallampatti cluster villages
 * - Sends data to Supabase via WiFi
 * - Real-time dashboard updates
 */

#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================
// WiFi Configuration
// ============================================
const char* ssid = "Dharani";              // Your WiFi SSID
const char* password = "ABCDEFGH";         // Your WiFi password

// ============================================
// Supabase Configuration
// ============================================
// Get these from: Supabase Dashboard → Settings → API
const char* supabaseUrl = "https://uvqcctheqvuilwfbpqcd.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cWNjdGhlcXZ1aWx3ZmJwcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDA0NDgsImV4cCI6MjA3NjcxNjQ0OH0.BDPOk3CicghYD18lqRCvITbLyHKLP_mQWtprXrkXphs";

// ============================================
// LoRa Configuration (433MHz)
// ============================================
#define SS    5
#define RST   14
#define DIO0  2
#define BAND  433E6  // 433 MHz

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║  ESP32 LoRa Receiver - Water Monitor  ║");
  Serial.println("╚════════════════════════════════════════╝\n");

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

  // Initialize LoRa
  Serial.print("📡 Initializing LoRa...");
  LoRa.setPins(SS, RST, DIO0);

  if (!LoRa.begin(BAND)) {
    Serial.println(" FAILED!");
    Serial.println("❌ Check wiring:");
    Serial.println("   VCC → 3.3V (NOT 5V!)");
    Serial.println("   GND → GND");
    Serial.println("   NSS → GPIO5");
    Serial.println("   RST → GPIO14");
    Serial.println("   DIO0 → GPIO2");
    while (1);
  }

  // Configure LoRa (must match sender settings)
  LoRa.setSpreadingFactor(12);
  LoRa.setSignalBandwidth(62.5E3);
  LoRa.setCodingRate4(8);
  LoRa.setTxPower(20);

  Serial.println(" SUCCESS!");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("Frequency:       433 MHz");
  Serial.println("Spreading Factor: 12 (Long Range)");
  Serial.println("Bandwidth:       62.5 kHz");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  Serial.println("✅ System Ready - Listening for packets...\n");
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

    Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.println("📩 LoRa Packet Received");
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
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
  // Expected format: "LOC:nallampatti,PH:100.1,TURB:101.1,TEMP:102.1,TDS:103.1"

  // Extract location
  int locIndex = data.indexOf("LOC:");
  if (locIndex < 0) {
    Serial.println("⚠️  Error: No location found!");
    Serial.println("Expected format: LOC:nallampatti,PH:7.5,TURB:15.3,...\n");
    return;
  }

  int commaIndex = data.indexOf(",", locIndex);
  if (commaIndex < 0) {
    Serial.println("⚠️  Error: Invalid packet format!\n");
    return;
  }

  String location = data.substring(locIndex + 4, commaIndex);
  location.toLowerCase();

  Serial.print("📍 Location: ");
  Serial.println(location);
  Serial.println("Parsing sensors...");

  int successCount = 0;

  // Parse pH
  if (data.indexOf("PH:") >= 0) {
    float value = extractValue(data, "PH:");
    if (sendToSupabase(location, "ph", value, rssi)) {
      Serial.print("  ✓ pH: ");
      Serial.println(value, 1);
      successCount++;
    }
  }

  // Parse Turbidity
  if (data.indexOf("TURB:") >= 0) {
    float value = extractValue(data, "TURB:");
    if (sendToSupabase(location, "turbidity", value, rssi)) {
      Serial.print("  ✓ Turbidity: ");
      Serial.print(value, 1);
      Serial.println(" NTU");
      successCount++;
    }
  }

  // Parse Temperature
  if (data.indexOf("TEMP:") >= 0) {
    float value = extractValue(data, "TEMP:");
    if (sendToSupabase(location, "temperature", value, rssi)) {
      Serial.print("  ✓ Temperature: ");
      Serial.print(value, 1);
      Serial.println(" °C");
      successCount++;
    }
  }

  // Parse TDS
  if (data.indexOf("TDS:") >= 0) {
    float value = extractValue(data, "TDS:");
    if (sendToSupabase(location, "tds", value, rssi)) {
      Serial.print("  ✓ TDS: ");
      Serial.print(value, 1);
      Serial.println(" ppm");
      successCount++;
    }
  }

  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
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
// Send Data to Supabase
// ============================================
bool sendToSupabase(String location, String sensorType, float value, int rssi) {
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

  // Build sensor_id using simple format: "location_sensortype"
  // Examples: "nallampatti_ph", "poolampatti_turbidity"
  // This works with ANY location - no hardcoding needed!
  String sensorId = location + "_" + sensorType;
  
  // Supabase RPC endpoint
  String url = String(supabaseUrl) + "/rest/v1/rpc/insert_reading";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseKey);
  http.setTimeout(10000);  // 10 second timeout

  // Build JSON payload
  StaticJsonDocument<200> doc;
  doc["p_sensor_id"] = sensorId;
  doc["p_value"] = value;
  doc["p_rssi"] = rssi;

  String payload;
  serializeJson(doc, payload);

  // Send POST request
  int httpCode = http.POST(payload);

  bool success = false;
  if (httpCode == 200 || httpCode == 201 || httpCode == 204) {
    success = true;
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
