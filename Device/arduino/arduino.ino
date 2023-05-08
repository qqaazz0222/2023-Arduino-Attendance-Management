#include <SoftwareSerial.h>
SoftwareSerial wifiSerial(2,3); //RX, TX

#define ssid "SW중심_단장실"
#define password "12345678"

void setup() {
  Serial.begin(9600);
  wifiSerial.begin(9600);
  wifiSerial.print("AT+CWJAP=\"");
  wifiSerial.print(ssid);
  wifiSerial.print("\",\"");
  wifiSerial.print(password);
  wifiSerial.println("\"");
}

void loop() {
  
}