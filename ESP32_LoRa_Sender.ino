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
 * - Cycles through 5 Nallampatti cluster villages
 * - Sends 4 sensor readings per location: pH, Turbidity, Temperature, TDS
 * - Sequential values starting from 100.1, incrementing by 1.0
 * - Transmits every 20 seconds
 */

 