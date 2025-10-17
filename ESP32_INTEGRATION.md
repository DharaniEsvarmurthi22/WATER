# ESP32 Integration Guide

This guide explains how to integrate your ESP32 device with the Water Dashboard for real-time sensor data transmission.

## Overview

The ESP32 will send sensor readings to Supabase, which will automatically update the web dashboard in real-time using Supabase Realtime subscriptions.

## Supabase Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and anon key
3. Update your `.env` file with these credentials

### 2. Create Database Table

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

-- Create policy for API access (adjust as needed)
CREATE POLICY "Allow API access to sensor data" ON sensor_data
    FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sensor_data;
```

### 3. Create API Key (Optional)

For production, create a service role key in Supabase dashboard for server-to-server communication.

## ESP32 Code

### Required Libraries

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
```

### Complete ESP32 Code Example

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Supabase configuration
const char* supabaseUrl = "YOUR_SUPABASE_URL";
const char* supabaseKey = "YOUR_SUPABASE_ANON_KEY";

// Sensor configuration
const char* sensorId = "sensor_001";
const char* sensorName = "ESP32 Water Sensor";
const double latitude = 40.7128;   // Your sensor's latitude
const double longitude = -74.0060; // Your sensor's longitude

// Sensor pin (example for analog sensor)
const int sensorPin = A0;

// Timing
unsigned long lastReading = 0;
const unsigned long readingInterval = 30000; // 30 seconds

void setup() {
    Serial.begin(115200);
    
    // Initialize sensor pin
    pinMode(sensorPin, INPUT);
    
    // Connect to WiFi
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi");
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println();
    Serial.println("WiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
}

void loop() {
    // Check if it's time to take a reading
    if (millis() - lastReading >= readingInterval) {
        // Read sensor value
        float sensorValue = readSensor();
        
        // Send to Supabase
        if (sendToSupabase(sensorValue)) {
            Serial.println("Data sent successfully!");
        } else {
            Serial.println("Failed to send data");
        }
        
        lastReading = millis();
    }
    
    delay(1000); // Small delay to prevent excessive CPU usage
}

float readSensor() {
    // Example: Read analog sensor and convert to meaningful value
    int rawValue = analogRead(sensorPin);
    
    // Convert to your sensor's units (example conversion)
    // Adjust this formula based on your specific sensor
    float calibratedValue = (rawValue / 4095.0) * 100.0; // 0-100 range
    
    Serial.print("Sensor reading: ");
    Serial.println(calibratedValue);
    
    return calibratedValue;
}

bool sendToSupabase(float value) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi not connected");
        return false;
    }
    
    HTTPClient http;
    
    // Construct Supabase REST API URL
    String url = String(supabaseUrl) + "/rest/v1/sensor_data";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", supabaseKey);
    http.addHeader("Authorization", "Bearer " + String(supabaseKey));
    http.addHeader("Prefer", "return=minimal");
    
    // Create JSON payload
    DynamicJsonDocument doc(1024);
    doc["sensor_id"] = sensorId;
    doc["name"] = sensorName;
    doc["latitude"] = latitude;
    doc["longitude"] = longitude;
    doc["value"] = value;
    doc["unit"] = "ppm"; // Adjust unit as needed
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("Sending: " + jsonString);
    
    // Send POST request
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.println("HTTP Response: " + String(httpResponseCode));
        Serial.println("Response: " + response);
        
        http.end();
        return (httpResponseCode == 201); // 201 = Created
    } else {
        Serial.println("Error in HTTP request: " + String(httpResponseCode));
        http.end();
        return false;
    }
}
```

## Alternative: Using Supabase Edge Functions

For more complex processing, you can create a Supabase Edge Function:

### 1. Create Edge Function

```typescript
// supabase/functions/sensor-data/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { sensor_id, value, latitude, longitude, name } = await req.json()

    const { data, error } = await supabaseClient
      .from('sensor_data')
      .insert([
        {
          sensor_id,
          name,
          latitude,
          longitude,
          value,
          timestamp: new Date().toISOString()
        }
      ])

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
```

### 2. ESP32 Code for Edge Function

```cpp
bool sendToSupabaseFunction(float value) {
    HTTPClient http;
    
    // Use Edge Function URL
    String url = String(supabaseUrl) + "/functions/v1/sensor-data";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + String(supabaseKey));
    
    // Create JSON payload
    DynamicJsonDocument doc(512);
    doc["sensor_id"] = sensorId;
    doc["name"] = sensorName;
    doc["latitude"] = latitude;
    doc["longitude"] = longitude;
    doc["value"] = value;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    
    http.end();
    return (httpResponseCode == 200);
}
```

## Sensor Types and Calibration

### Water Quality Sensors

1. **pH Sensors**: Convert voltage to pH scale (0-14)
2. **TDS Sensors**: Total Dissolved Solids in ppm
3. **Turbidity Sensors**: Water clarity measurement
4. **Temperature Sensors**: DS18B20 or analog temperature

### Example Calibration Functions

```cpp
// pH Sensor calibration
float readPH() {
    int rawValue = analogRead(phSensorPin);
    float voltage = rawValue * (3.3 / 4095.0);
    float ph = 3.5 * voltage + 0.0; // Adjust calibration
    return ph;
}

// TDS Sensor calibration
float readTDS() {
    int rawValue = analogRead(tdsSensorPin);
    float voltage = rawValue * (3.3 / 4095.0);
    float tds = (133.42 * voltage * voltage * voltage 
                - 255.86 * voltage * voltage 
                + 857.39 * voltage) * 0.5;
    return tds;
}
```

## Troubleshooting

### Common Issues

1. **WiFi Connection Problems**
   - Check SSID and password
   - Ensure ESP32 is in range
   - Try different WiFi networks

2. **HTTP Request Failures**
   - Verify Supabase URL and API key
   - Check internet connectivity
   - Monitor serial output for error codes

3. **Data Not Appearing in Dashboard**
   - Verify table structure matches
   - Check Row Level Security policies
   - Ensure realtime is enabled

### Debug Tips

```cpp
// Add more detailed logging
void debugHTTPResponse(HTTPClient &http, int responseCode) {
    Serial.println("=== HTTP Debug ===");
    Serial.println("Response Code: " + String(responseCode));
    Serial.println("Response: " + http.getString());
    Serial.println("==================");
}
```

## Security Considerations

1. **Use Environment Variables**: Store credentials securely
2. **Implement Authentication**: Use service role keys for production
3. **Rate Limiting**: Implement delays between requests
4. **Data Validation**: Validate sensor readings before sending
5. **HTTPS Only**: Always use secure connections

## Power Management

For battery-powered sensors:

```cpp
#include "esp_sleep.h"

void enterDeepSleep() {
    Serial.println("Entering deep sleep for 5 minutes");
    esp_sleep_enable_timer_wakeup(5 * 60 * 1000000); // 5 minutes in microseconds
    esp_deep_sleep_start();
}
```

## Next Steps

1. Deploy your web dashboard
2. Configure your ESP32 with the provided code
3. Test the real-time data flow
4. Add multiple sensors with unique IDs
5. Implement data validation and error handling
6. Set up monitoring and alerts

For support, check the Supabase documentation or create an issue in the project repository.
