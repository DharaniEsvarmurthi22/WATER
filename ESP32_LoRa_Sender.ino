/*
 * ESP32 LoRa Sender - Water Quality Monitoring
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
 * - Cycles through 4 locations: ukkadam → singanallur → redhills → porur
 * - Sends 4 sensor readings per location: pH, Turbidity, Temperature, TDS
 * - Sequential values starting from 100.1, incrementing by 1.0
 * - Transmits every 20 seconds
 */

#include <SPI.h>
#include <LoRa.h>

// LoRa Pin Configuration
#define SS    5     // NSS
#define RST   14    // Reset
#define DIO0  2     // DIO0
#define BAND  433E6 // 433MHz frequency

// Location rotation
String locations[] = {"ukkadam", "singanallur", "redhills", "porur"};
int currentLocationIndex = 0;

// Sensor values (starting at 100.1, incrementing by 1.0 each transmission)
float ph_value = 100.1;
float turbidity_value = 100.1;
float temperature_value = 100.1;
float tds_value = 100.1;

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║   ESP32 LoRa Sender - Water Monitor   ║");
  Serial.println("╚════════════════════════════════════════╝\n");

  // Initialize LoRa
  LoRa.setPins(SS, RST, DIO0);

  if (!LoRa.begin(BAND)) {
    Serial.println("❌ LoRa initialization failed!");
    Serial.println("Check wiring and restart.");
    while (1);
  }

  // Configure LoRa for long range
  LoRa.setSpreadingFactor(12);      // Max range
  LoRa.setSignalBandwidth(62.5E3);  // 62.5 kHz
  LoRa.setCodingRate4(8);           // Max error correction
  LoRa.setTxPower(20);              // Max power (20 dBm)

  Serial.println("✅ LoRa Initialized Successfully!");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("Frequency:       433 MHz");
  Serial.println("Spreading Factor: 12 (Long Range)");
  Serial.println("Bandwidth:       62.5 kHz");
  Serial.println("TX Power:        20 dBm");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  Serial.println("🔄 Cycling through 4 locations every 20s\n");
}

void loop() {
  // Get current location
  String location = locations[currentLocationIndex];

  // Build packet in format: "LOC:ukkadam,PH:100.1,TURB:101.1,TEMP:102.1,TDS:103.1"
  String packet = "LOC:" + location + 
                  ",PH:" + String(ph_value, 1) +
                  ",TURB:" + String(turbidity_value, 1) +
                  ",TEMP:" + String(temperature_value, 1) +
                  ",TDS:" + String(tds_value, 1);

  // Display transmission info
  Serial.println("┌─────────────────────────────────────────");
  Serial.print("│ 📍 Location: ");
  Serial.println(location);
  Serial.println("├─────────────────────────────────────────");
  Serial.print("│ pH:          ");
  Serial.println(ph_value, 1);
  Serial.print("│ Turbidity:   ");
  Serial.print(turbidity_value, 1);
  Serial.println(" NTU");
  Serial.print("│ Temperature: ");
  Serial.print(temperature_value, 1);
  Serial.println(" °C");
  Serial.print("│ TDS:         ");
  Serial.print(tds_value, 1);
  Serial.println(" ppm");
  Serial.println("└─────────────────────────────────────────");

  // Send via LoRa
  Serial.print("📤 Transmitting: ");
  Serial.println(packet);
  
  LoRa.beginPacket();
  LoRa.print(packet);
  LoRa.endPacket();

  Serial.println("✅ Packet sent!\n");

  // Increment values (sequential: 100.1 → 101.1 → 102.1 ...)
  ph_value += 1.0;
  turbidity_value += 1.0;
  temperature_value += 1.0;
  tds_value += 1.0;

  // Reset to 100.1 after reaching 200.1
  if (ph_value > 200.1) {
    ph_value = 100.1;
    turbidity_value = 100.1;
    temperature_value = 100.1;
    tds_value = 100.1;
    Serial.println("🔄 Values reset to 100.1\n");
  }

  // Move to next location (cycle through all 4)
  currentLocationIndex++;
  if (currentLocationIndex >= 4) {
    currentLocationIndex = 0;
    Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    Serial.println("🔁 Completed full cycle - restarting\n");
  }

  // Wait 20 seconds before next transmission
  delay(20000);
}
