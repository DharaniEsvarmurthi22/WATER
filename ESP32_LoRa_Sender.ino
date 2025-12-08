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
// 5 Villages Configuration (Salem Taluks)
// ============================================
const char* villages[] = {
  "edappadi",
  "mettur",
  "omalur",
  "sankari",
  "salemsouth",
  "yercaud"
};

const int numVillages = 6;
int currentVillage = 0;

// ============================================
// Setup
// ============================================
void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║   ESP32 LoRa Sender - Water Monitor   ║");
  Serial.println("║        6 Salem Taluks Data Stream      ║");
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
  Serial.println("Villages:         6 (Salem Taluks)");
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

  // Wait 20 seconds before next transmission
  delay(20000);
}

// ============================================
// Build LoRa Packet with Random Realistic Values
// ============================================
String buildPacket() {
  String packet = "LOC:" + String(villages[currentVillage]) + ",";
  
  // Generate random values within realistic ranges
  // pH: 6.1 - 9.2
  float ph = random(610, 921) / 100.0;
  
  // Turbidity: 0 - 5 NTU
  float turbidity = random(0, 501) / 100.0;
  
  // Temperature: 18 - 27 °C
  float temperature = random(1800, 2701) / 100.0;
  
  // TDS: 150 - 2000 ppm
  int tds = random(150, 2001);
  
  packet += "PH:" + String(ph, 2) + ",";
  packet += "TURB:" + String(turbidity, 2) + ",";
  packet += "TEMP:" + String(temperature, 2) + ",";
  packet += "TDS:" + String(tds);

  return packet;
}
