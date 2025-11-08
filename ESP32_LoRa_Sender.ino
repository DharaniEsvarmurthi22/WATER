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
 * - Cycles through 5 villages: Kadambur, Naduvalur, Othiyathur, Manjini, Pungavadi
 * - Sends 4 sensor readings per location: pH, Turbidity, Temperature, TDS
 * - Realistic sensor values with random variations
 * - Transmits every 15 seconds
 */

#include <SPI.h>
#include <LoRa.h>

// ============================================
// LoRa Configuration (433MHz)
// ============================================
#define SS    5
#define RST   14
#define DIO0  2
#define BAND  433E6  // 433 MHz

// ============================================
// 5 Villages Configuration (Nallampatti Cluster)
// ============================================
const char* villages[] = {
  "kadambur",
  "naduvalur",
  "othiyathur",
  "manjini",
  "pungavadi"
};

const int numVillages = 5;
int currentVillage = 0;

// Sequential counter for sensor values
float sensorValue = 10.1;  // Starting value

// ============================================
// Setup
// ============================================
void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║   ESP32 LoRa Sender - Water Monitor   ║");
  Serial.println("║        5 Villages Data Stream          ║");
  Serial.println("╚════════════════════════════════════════╝\n");

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

  // Configure LoRa for maximum range
  LoRa.setSpreadingFactor(12);        // Maximum range (slowest)
  LoRa.setSignalBandwidth(62.5E3);    // Lower bandwidth = better range
  LoRa.setCodingRate4(8);             // Maximum error correction
  LoRa.setTxPower(20);                // Maximum transmission power

  Serial.println(" SUCCESS!");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("Frequency:        433 MHz");
  Serial.println("Spreading Factor: 12 (Max Range)");
  Serial.println("Bandwidth:        62.5 kHz");
  Serial.println("TX Power:         20 dBm");
  Serial.println("Villages:         5 (Nallampatti Cluster)");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  Serial.println("✅ System Ready - Starting transmission...\n");
}

// ============================================
// Main Loop
// ============================================
void loop() {
  // Build packet
  String packet = buildPacket();

  // Send packet
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.print("📡 Transmitting [");
  Serial.print(currentVillage + 1);
  Serial.print("/");
  Serial.print(numVillages);
  Serial.println("]");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.print("📍 Location: ");
  Serial.println(villages[currentVillage]);
  Serial.print("📦 Packet: ");
  Serial.println(packet);
  Serial.print("📏 Size: ");
  Serial.print(packet.length());
  Serial.println(" bytes");

  LoRa.beginPacket();
  LoRa.print(packet);
  LoRa.endPacket();

  Serial.println("✅ Transmission complete!\n");

  // Move to next village
  currentVillage = (currentVillage + 1) % numVillages;

  // Increment value only after completing all villages
  if (currentVillage == 0) {
    sensorValue += 1.0;
  }

  // Wait 20 seconds before next transmission
  delay(20000);
}

// ============================================
// Build LoRa Packet
// ============================================
String buildPacket() {
  String packet = "LOC:" + String(villages[currentVillage]) + ",";
  
  // All 4 sensors get the SAME value for this village
  packet += "PH:" + String(sensorValue, 1) + ",";
  packet += "TURB:" + String(sensorValue, 1) + ",";
  packet += "TEMP:" + String(sensorValue, 1) + ",";
  packet += "TDS:" + String(sensorValue, 1);

  return packet;
}
