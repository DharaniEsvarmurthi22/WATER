// ESP32 Water Quality Monitor - Device-Specific Tables
// Transmits to Supabase function that auto-creates device table

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase configuration
const char* supabaseUrl = "https://YOUR_PROJECT.supabase.co";
const char* supabaseAnonKey = "YOUR_ANON_KEY";

// Device credentials (UNIQUE PER DEVICE)
const char* deviceId = "ESP32_SALEM_001";  // Change for each device
const char* devicePassword = "your_device_password";  // Secret password for this device

// Sensor pins (example)
#define PH_PIN 34
#define TURBIDITY_PIN 35
#define TEMP_PIN 36
#define TDS_PIN 39

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Connect to WiFi
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Device ID: ");
  Serial.println(deviceId);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // Read sensors
    float phValue = readPH();
    float turbidity = readTurbidity();
    float temperature = readTemperature();
    float tds = readTDS();
    int rssi = WiFi.RSSI();
    
    // Send each reading to Supabase
    sendReading("ph_sensor", phValue, rssi);
    delay(1000);
    
    sendReading("turbidity_sensor", turbidity, rssi);
    delay(1000);
    
    sendReading("temperature_sensor", temperature, rssi);
    delay(1000);
    
    sendReading("tds_sensor", tds, rssi);
    delay(1000);
  } else {
    Serial.println("WiFi disconnected, reconnecting...");
    WiFi.reconnect();
  }
  
  // Wait before next reading cycle
  delay(60000); // 1 minute
}

void sendReading(const char* sensorId, float value, int rssi) {
  HTTPClient http;
  
  // Supabase RPC endpoint
  String url = String(supabaseUrl) + "/rest/v1/rpc/insert_device_reading";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseAnonKey);
  http.addHeader("Authorization", String("Bearer ") + supabaseAnonKey);
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["p_device_id"] = deviceId;
  doc["p_device_password"] = devicePassword;
  doc["p_sensor_id"] = sensorId;
  doc["p_value"] = value;
  doc["p_rssi"] = rssi;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.println("\n--- Sending Reading ---");
  Serial.print("Sensor: ");
  Serial.println(sensorId);
  Serial.print("Value: ");
  Serial.println(value);
  Serial.print("Payload: ");
  Serial.println(jsonPayload);
  
  // Send POST request
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Response code: ");
    Serial.println(httpResponseCode);
    Serial.print("Response: ");
    Serial.println(response);
    
    // Parse response
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error) {
      bool success = responseDoc["success"];
      const char* message = responseDoc["message"];
      const char* table = responseDoc["table"];
      
      if (success) {
        Serial.print("✓ Success! Table: ");
        Serial.println(table);
      } else {
        const char* errorMsg = responseDoc["error"];
        Serial.print("✗ Error: ");
        Serial.println(errorMsg);
      }
    }
  } else {
    Serial.print("✗ HTTP Error: ");
    Serial.println(httpResponseCode);
    Serial.println(http.errorToString(httpResponseCode));
  }
  
  http.end();
}

// Sensor reading functions
float readPH() {
  int rawValue = analogRead(PH_PIN);
  float voltage = rawValue * (3.3 / 4095.0);
  float ph = 7.0 + ((2.5 - voltage) / 0.18);
  
  // Validate pH range
  if (ph < 0) ph = 0;
  if (ph > 14) ph = 14;
  
  return ph;
}

float readTurbidity() {
  int rawValue = analogRead(TURBIDITY_PIN);
  float voltage = rawValue * (3.3 / 4095.0);
  float turbidity = (voltage / 3.3) * 3000; // Convert to NTU
  
  if (turbidity < 0) turbidity = 0;
  
  return turbidity;
}

float readTemperature() {
  // Example for DS18B20 or analog temperature sensor
  int rawValue = analogRead(TEMP_PIN);
  float voltage = rawValue * (3.3 / 4095.0);
  float temperature = (voltage - 0.5) * 100; // TMP36 formula
  
  return temperature;
}

float readTDS() {
  int rawValue = analogRead(TDS_PIN);
  float voltage = rawValue * (3.3 / 4095.0);
  float tds = (133.42 * voltage * voltage * voltage 
               - 255.86 * voltage * voltage 
               + 857.39 * voltage) * 0.5;
  
  if (tds < 0) tds = 0;
  
  return tds;
}
