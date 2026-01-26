/*
 * ESP32 Password-Based Device Claiming System
 * 
 * HOW IT WORKS:
 * 1. Each ESP32 has a UNIQUE SECRET (like a password)
 * 2. ESP32 sends data to Supabase with this secret
 * 3. User enters the secret in dashboard to "claim" the device
 * 4. Once claimed, only that user can see the device's data
 * 
 * SETUP INSTRUCTIONS:
 * 1. Generate a unique secret for THIS device (e.g., "SALEM2024ABC123")
 * 2. Set DEVICE_SECRET below
 * 3. Set WiFi credentials
 * 4. Upload to ESP32
 * 5. Give the DEVICE_SECRET to the user who will claim it
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_wifi.h>

// ==================== DEVICE SECRET (CHANGE FOR EACH DEVICE) ====================
// This is like a password - keep it secret! Users need this to claim the device.
// Make it unique and hard to guess. Examples:
// - "SALEM_2024_DEVICE_001_XYZ"
// - "WATER_MONITOR_ABC123DEF"
// - "ESP32_SALEM_SECRET_789"

const char* DEVICE_SECRET = "SALEM2024ABC123";  // ⚠️ CHANGE THIS FOR EACH DEVICE!

// ==================== WiFi Configuration ====================
const char* ssid = "Dharani";           // Your WiFi name
const char* password = "ABCDEFGH";      // Your WiFi password

// ==================== Supabase Configuration ====================
const char* supabaseUrl = "https://uvqcctheqvuilwfbpqcd.supabase.co";
const char* supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cWNjdGhlcXZ1aWx3ZmJwcWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNDA0NDgsImV4cCI6MjA3NjcxNjQ0OH0.BDPOk3CicghYD18lqRCvITbLyHKLP_mQWtprXrkXphs";

// ==================== Device Configuration ====================
String deviceMacAddress = "";  // Auto-populated from WiFi MAC
const char* deviceName = "Salem Water Monitor";  // Optional friendly name

// ==================== GPS Configuration ====================
// Fixed Location (for static installation)
float currentLatitude = 11.4102;               // Set your device's GPS latitude
float currentLongitude = 77.7197;              // Set your device's GPS longitude

// Random Testing Mode (set false for production)
#define USE_RANDOM_GPS true                    // Set to false for fixed location
float gpsRandomRange = 0.01;                   // ±0.01 degrees (~1.1km variation)

// ==================== LED Configuration ====================
#define LED_PIN 2               // Built-in LED for status

// ==================== Timing Configuration ====================
unsigned long lastSendTime = 0;
const unsigned long sendInterval = 15000;  // Send data every 15 seconds

// ==================== Registration Status ====================
bool isRegistered = false;

// ==================== Function Declarations ====================
void connectWiFi();
void getDeviceMac();
bool registerDevice();
bool sendSensorData(String jsonData);
String generateSensorData();
void getGPSCoordinates(float &lat, float &lon);
void blinkLED(int times, int delayMs);

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize random seed
  randomSeed(analogRead(0));
  
  Serial.println("\n\n╔════════════════════════════════════════════╗");
  Serial.println("║  ESP32 Password-Based Device System       ║");
  Serial.println("║  User Claims Device with Secret Code      ║");
  Serial.println("╚════════════════════════════════════════════╝\n");
  
  Serial.print("Device Secret: ");
  Serial.println(DEVICE_SECRET);
  
  // Connect to WiFi
  connectWiFi();
  
  // Get MAC address
  getDeviceMac();
  
  Serial.println("\n📝 Step 1: Registering device with Supabase...");
  if (registerDevice()) {
    isRegistered = true;
    blinkLED(3, 200);  // 3 quick blinks = success
    Serial.println("✅ Device registered successfully!");
    Serial.println("\n📱 Give this secret to the user:");
    Serial.println("┌────────────────────────────────────┐");
    Serial.print  ("│  SECRET: ");
    Serial.print(DEVICE_SECRET);
    for(int i = strlen(DEVICE_SECRET); i < 25; i++) Serial.print(" ");
    Serial.println("│");
    Serial.println("└────────────────────────────────────┘");
    Serial.println("User can claim this device in the dashboard!\n");
  } else {
    blinkLED(5, 100);  // 5 fast blinks = error
    Serial.println("⚠️  Registration failed - will retry with each transmission");
  }
  
  Serial.println("✅ Setup complete! Starting data transmission...\n");
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
    Serial.println("📡 Transmitting Sensor Data");
    Serial.println("========================================");
    
    // Generate and send sensor data
    String jsonData = generateSensorData();
    
    Serial.println("\n--- Sending to Supabase ---");
    bool success = sendSensorData(jsonData);
    
    if (success) {
      Serial.println("✓ Data sent successfully!");
      blinkLED(1, 100);  // Single blink = data sent
    } else {
      Serial.println("✗ Failed to send data");
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
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));  // Blink while connecting
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_PIN, LOW);
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
    Serial.println("Please check your WiFi credentials.");
  }
}

// ==================== Get Device MAC Address ====================
void getDeviceMac() {
  uint8_t mac[6];
  esp_wifi_get_mac(WIFI_IF_STA, mac);
  
  char macStr[18];
  sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", 
          mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  
  deviceMacAddress = String(macStr);
  
  Serial.print("📱 Device MAC: ");
  Serial.println(deviceMacAddress);
}

// ==================== Register Device with Supabase ====================
bool registerDevice() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No WiFi - cannot register");
    return false;
  }
  
  HTTPClient http;
  WiFiClient client;
  
  // Call register_device RPC function
  String url = String(supabaseUrl) + "/rest/v1/rpc/register_device";
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Prefer", "return=representation");
  
  // Create registration payload
  StaticJsonDocument<256> doc;
  doc["p_device_secret"] = DEVICE_SECRET;
  doc["p_device_mac"] = deviceMacAddress;
  doc["p_latitude"] = currentLatitude;
  doc["p_longitude"] = currentLongitude;
  doc["p_device_name"] = deviceName;
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("Registration payload:");
  Serial.println(payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Response Code: ");
    Serial.println(httpCode);
    Serial.println("Response:");
    Serial.println(response);
    
    http.end();
    return (httpCode == 200 || httpCode == 201);
  } else {
    Serial.print("Registration failed. Error: ");
    Serial.println(http.errorToString(httpCode));
    http.end();
    return false;
  }
}

// ==================== Send Sensor Data to Supabase ====================
bool sendSensorData(String jsonData) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No WiFi connection");
    return false;
  }
  
  HTTPClient http;
  WiFiClient client;
  
  // Send to sensor_readings table
  String url = String(supabaseUrl) + "/rest/v1/sensor_readings";
  
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  http.addHeader("Prefer", "return=minimal");
  
  Serial.println("📤 Sending:");
  Serial.println(jsonData);
  
  int httpCode = http.POST(jsonData);
  
  if (httpCode > 0) {
    Serial.print("✓ HTTP Response Code: ");
    Serial.println(httpCode);
    
    if (httpCode == 201 || httpCode == 200) {
      String response = http.getString();
      if (response.length() > 0) {
        Serial.println("Response:");
        Serial.println(response);
      }
      http.end();
      return true;
    }
  } else {
    Serial.print("✗ HTTP Error: ");
    Serial.println(http.errorToString(httpCode));
  }
  
  http.end();
  return false;
}

// ==================== Generate Sensor Data ====================
String generateSensorData() {
  StaticJsonDocument<512> doc;
  
  // Get GPS coordinates
  float lat, lon;
  getGPSCoordinates(lat, lon);
  
  // Add device identification
  doc["device_secret"] = DEVICE_SECRET;  // This is the key for claiming!
  doc["device_mac"] = deviceMacAddress;
  doc["device_name"] = deviceName;
  
  // Add GPS coordinates
  doc["latitude"] = lat;
  doc["longitude"] = lon;
  
  // Generate sensor readings
  float phValue = random(610, 921) / 100.0;          // pH: 6.1 - 9.2
  float turbidity = random(0, 501) / 100.0;          // Turbidity: 0 - 5 NTU
  float temperature = random(1800, 2701) / 100.0;    // Temperature: 18 - 27°C
  int tds = random(150, 2001);                        // TDS: 150 - 2000 ppm
  float waterLevel = random(2000, 9001) / 100.0;     // Water Level: 20 - 90 cm
  float flowRate = random(500, 4501) / 100.0;        // Flow Rate: 5 - 45 L/min
  
  doc["water_level"] = waterLevel;
  doc["flow_rate"] = flowRate;
  doc["ph"] = phValue;
  doc["turbidity"] = turbidity;
  doc["temperature"] = temperature;
  doc["tds"] = tds;
  
  // Calculate status
  String status = "Good";
  if (phValue < 6.5 || phValue > 8.5 || turbidity > 3.0 || tds > 1500) {
    status = "Warning";
  }
  if (phValue < 6.0 || phValue > 9.0 || turbidity > 5.0 || tds > 1800) {
    status = "Critical";
  }
  doc["status"] = status;
  
  // Serialize to JSON
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Print summary
  Serial.println("\n📊 Sensor Readings:");
  Serial.print("  GPS: "); Serial.print(lat, 6); Serial.print(", "); Serial.println(lon, 6);
  Serial.print("  pH: "); Serial.println(phValue);
  Serial.print("  Temperature: "); Serial.print(temperature); Serial.println("°C");
  Serial.print("  Turbidity: "); Serial.print(turbidity); Serial.println(" NTU");
  Serial.print("  TDS: "); Serial.print(tds); Serial.println(" ppm");
  Serial.print("  Water Level: "); Serial.print(waterLevel); Serial.println(" cm");
  Serial.print("  Flow Rate: "); Serial.print(flowRate); Serial.println(" L/min");
  Serial.print("  Status: "); Serial.println(status);
  
  return jsonString;
}

// ==================== Get GPS Coordinates ====================
void getGPSCoordinates(float &lat, float &lon) {
  if (USE_RANDOM_GPS) {
    // Random offset for testing
    float latOffset = (random(-100, 101) / 10000.0) * gpsRandomRange;
    float lonOffset = (random(-100, 101) / 10000.0) * gpsRandomRange;
    
    lat = currentLatitude + latOffset;
    lon = currentLongitude + lonOffset;
  } else {
    // Fixed location
    lat = currentLatitude;
    lon = currentLongitude;
  }
}

// ==================== Blink LED ====================
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}
