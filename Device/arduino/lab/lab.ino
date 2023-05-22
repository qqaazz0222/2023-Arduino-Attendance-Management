

// 핀설정(버튼1, 버튼2, LCD, 지문인식)

// 라이브러리 설정
#include <Wire.h> // LCD I2C 방식 통신용 라이브러리
#include <LiquidCrystal_I2C.h> // LCD 함수 라이브러리
#include <stdio.h> // 기본 입출력 라이브러리
#include <Adafruit_Fingerprint.h> // 지문인식 라이브러리
#include <ESP8266WiFi.h> // 와이파이 라이브러리
#include <ESP8266HTTPClient.h> // 와이파이 HTTP 통신 라이브러리
#include <WiFiClient.h> // 와이파이 통신 라이브러리
#include <ArduinoJson.h>
#include <ArduinoJson.hpp>

#if (defined(__AVR__) || defined(ESP8266)) && !defined(__AVR_ATmega2560__)
SoftwareSerial mySerial(2, 3);
#else
#define mySerial Serial1
#endif

Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

LiquidCrystal_I2C lcd(0x27, 16, 2); // 0x27 I2C 주소를 가지고 있는 16x2 LCD 객체를 생성 

// 핀 정의
int BTN_1 = 12;
int BTN_2 = 16;

// 변수 정의
uint8_t id; // 아이디
uint8_t max_id = 23 + 100; // 연구실 좌석 마지막 번호 + 1
const char* ssid = "SW중심_단장실"; // 와이파이 이름
const char* password = "12345678"; // 와이파이 비밀번호
String serverUrl = "http://192.168.0.229:3000/checkin"; // 서버 주소

void setup() {
  Serial.begin(9600);
  delay(10);
  // 버튼 설정
  pinMode(BTN_1, INPUT);
  pinMode(BTN_2, INPUT); 
  // LCD 설정
  // I2C LCD 초기화
  lcd.init();
  // I2C LCD의 백라이트를 켜줌
  lcd.backlight();
  // LCD 초기 화면 출력
  lcd.setCursor(4,0);
  lcd.print("AI+X LAB");
  lcd.setCursor(0,1);
  lcd.print("INIT SETTINGS...");
  delay(1000);
  // WiFi 설정
  lcd.clear();
  lcd.setCursor(4,0);
  lcd.print("AI+X LAB");
  lcd.setCursor(0,1);
  lcd.print("WIFI SETTINGS...");
  WiFi.begin(ssid, password); // WiFi 연결 시도
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.println("connection Start");
  // 지문센서 설정
  lcd.clear();
  lcd.setCursor(4,0);
  lcd.print("AI+X LAB");
  lcd.setCursor(0,1);
  lcd.print("FGRS SETTINGS...");
  finger.begin(57600); // 지문센서 시작
  // 지문 센서 탐지
  if (finger.verifyPassword()) {
    Serial.println("Found fingerprint sensor!");
  } else {
    Serial.println("Did not find fingerprint sensor :(");
    while (1) { delay(1); }
  }
  // 지문 센서 정보 출력
  Serial.println(F("Reading sensor parameters"));
  finger.getParameters();
  Serial.print(F("Status: 0x")); Serial.println(finger.status_reg, HEX);
  Serial.print(F("Sys ID: 0x")); Serial.println(finger.system_id, HEX);
  Serial.print(F("Capacity: ")); Serial.println(finger.capacity);
  Serial.print(F("Security level: ")); Serial.println(finger.security_level);
  Serial.print(F("Device address: ")); Serial.println(finger.device_addr, HEX);
  Serial.print(F("Packet len: ")); Serial.println(finger.packet_len);
  Serial.print(F("Baud rate: ")); Serial.println(finger.baud_rate);

  // 지문 센서 데이터베이스 불러오기
  finger.getTemplateCount();
  if (finger.templateCount == 0) {
    Serial.print("Sensor doesn't contain any fingerprint data. Please run the 'enroll' example.");
  }
  else {
    Serial.println("Waiting for valid finger...");
      Serial.print("Sensor contains "); Serial.print(finger.templateCount); Serial.println(" templates");
  }
}
void loop() {
  // 설정 완룡 후, 초기화면 출력
  lcd.setCursor(4,0);
  lcd.print("AI+X LAB");
  lcd.setCursor(0,1);
  lcd.print("AddUser | IN&OUT");
  // 버튼 인식
  // 버튼 1이 눌렸을 때, 지문 등록 모드 전환
  if(digitalRead(BTN_1) == HIGH) {
    // LCD에 지문 등록 모드 화면 출력
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("AI+X LAB AddUser");
    lcd.setCursor(0,1);
    lcd.print("   Loading...   ");
    // 버튼 오작동을 막기위한 대기
    delay(2000);
    // 번호 설정(버튼 1: 증가, 버튼 2: 확인)
    id = 0;
    int cnt = 0;
    // 확인 버튼이 눌리기 전까지 증가 버튼을 통해 숫자 증가
    while(1) {
      // LCD 초기화
      if(cnt == 0){
        lcd.clear();
        cnt = 1;
      }
      // 버튼 1번 눌림 -> 번호 변경
      if(digitalRead(BTN_1) == HIGH) {
        id += 1;
        // 숫자가 좌석 수를 넘어가면, 0으로 변경
        if(id >= max_id-100) {
          id = 0;
          lcd.clear();
        } 
      }
      // LCD 화면에 번호 업데이트
      lcd.setCursor(0,0);
      lcd.print("Seat Number : ");
      lcd.setCursor(14,0);
      lcd.print(id);
      lcd.setCursor(0,1);
      lcd.print("  Plus  |   OK  ");
      // n에 좌석 번호가 아닌 0이 들어왔을 때, 입력 모드를 종료하고 버튼 대기 상태로 돌아감
      // n에 좌석 번호가 들어왔을 때, 지문 등록 절차로 넘어감
      if(digitalRead(BTN_2) == HIGH) {
        if(id == 0) {
          break;
        }
        // 지문 등록 코드
        id += 100;
        Serial.println("Ready to enroll a fingerprint!");
        while (!  getFingerprintEnroll() );
        break;
      }
      delay(200);
    }
    // 아이디값 초기화
    id = 0;
    lcd.clear();
    delay(2000);
  }

  // 버튼 2가 눌렸을 때, 지문 인식 모드 전환
  else if(digitalRead(BTN_2) == HIGH) {
    id = 0;
    // LCD에 지문 인식 모드 화면 출력
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("AI+X LAB  IN&OUT");
    lcd.setCursor(0,1);
    lcd.print("   Loading...   ");
    // 버튼 오작동을 막기위한 대기
    delay(2000);
    // 로딩 후, 화면 출력
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("AI+X LAB");
    lcd.setCursor(0,1);
    lcd.print("Take Your Finger");
    int cnt = 0;
    // 지문 인식 100번 시도
    while(cnt < 100) {
      if(cnt == 0) {
        lcd.clear();
        lcd.setCursor(4,0);
        lcd.print("AI+X LAB");
        lcd.setCursor(0,1);
        lcd.print("Take Your Finger");
      }
      cnt += 1;
      // 지문 인식해서 return되는 값을 id에 저장
      id = getFingerprintID();
      Serial.print(id);
      // 지문 인식 결과가 있으면, 입실 또는 퇴실 처리를 위해 서버로 좌석 번호를 전송
      if(100 < id){
        lcd.clear();
        lcd.setCursor(4,0);
        lcd.print("AI+X LAB");
        lcd.setCursor(0,1);
        lcd.print("  Send Server!  ");
        int state = 0;
        while(state != 200) {
          // 서버로 좌석 번호 전송
          if((WiFi.status() == WL_CONNECTED)) {
            WiFiClient wifiClient;
            HTTPClient httpClient;
            // URL은 요청을 보내고자 하는 URL 입력
            httpClient.begin(wifiClient,serverUrl);
            // 필요한 헤더 추가
            httpClient.addHeader("Content-Type", "application/json");
            // JSON 오브젝트
            StaticJsonDocument<200> json;
            // json에 데이터 저장
            json["id"] = finger.fingerID;
            String parsedJsonToString;
            // json을 String으로 변환
            serializeJson(json, parsedJsonToString);
            // POST 요청 보내기
            int httpResponseCode = httpClient.POST(parsedJsonToString);
            state = httpResponseCode;
            // HTTP 응답이 왔다면
            if (httpResponseCode > 0) {
              Serial.print("HTTP Response code: ");
              Serial.println(httpResponseCode);
              String response = httpClient.getString(); // 응답 본문을 문자열로 읽어옴
              Serial.println(response); // 시리얼 모니터에 출력
              String result = response.substring(11, 14);
              Serial.println(result); // 시리얼 모니터에 출력
              if(result == "ERR") {
                lcd.clear();
                lcd.setCursor(4,0);
                lcd.print("AI+X LAB");
                lcd.setCursor(2,1);
                lcd.print("Already OUT!");
              };
              if(result == "INN") {
                lcd.clear();
                lcd.setCursor(4,0);
                lcd.print("AI+X LAB");
                lcd.setCursor(0,1);
                lcd.print("Check IN Success");
              };
              if(result == "OUT") {
                lcd.clear();
                lcd.setCursor(4,0);
                lcd.print("AI+X LAB");
                lcd.setCursor(0,1);
                lcd.print("CheckOUT Success");
              };
            }
            else {
              Serial.print("Error code: ");
              Serial.println(httpResponseCode);
            }
            httpClient.end();
            delay(500);
          }
        }
        // 지문 인식 모드 종료
        delay(2000);
        break;
      }
      else {
        delay(50);
        cnt += 1;
      }
      delay(100);
    }
    delay(1000);
    // 아이디값 초기화
    id = 0;
    lcd.clear();
  }
}

// 지문 등록 코드
uint8_t getFingerprintEnroll() {
  int p = -1;
  lcd.clear();
  lcd.setCursor(4,0);
  lcd.print("AI+X LAB");
  lcd.setCursor(0,1);
  lcd.print("Take Your Finger");
  Serial.print("Waiting for valid finger to enroll as #"); Serial.println(id);
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
    case FINGERPRINT_OK:
      Serial.println("Image taken");
      break;
    case FINGERPRINT_NOFINGER:
      Serial.println(".");
      break;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      break;
    case FINGERPRINT_IMAGEFAIL:
      Serial.println("Imaging error");
      break;
    default:
      Serial.println("Unknown error");
      break;
    }
  }
  // 지문 이미지화
  p = finger.image2Tz(1);
  switch (p) {
    case FINGERPRINT_OK:
      Serial.println("Image converted");
      break;
    case FINGERPRINT_IMAGEMESS:
      Serial.println("Image too messy");
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      return p;
    case FINGERPRINT_FEATUREFAIL:
      Serial.println("Could not find fingerprint features");
      return p;
    case FINGERPRINT_INVALIDIMAGE:
      Serial.println("Could not find fingerprint features");
      return p;
    default:
      Serial.println("Unknown error");
      return p;
  }
  lcd.clear();
  lcd.setCursor(4,0);
  lcd.print("AI+X LAB");
  lcd.setCursor(0,1);
  lcd.print(" Remove Finger! ");
  Serial.println("Remove finger");
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) {
    p = finger.getImage();
  }
  Serial.print("ID "); Serial.println(id);
  p = -1;
  Serial.println("Place same finger again");
  lcd.clear();
  lcd.setCursor(4,0);
  lcd.print("AI+X LAB");
  lcd.setCursor(0,1);
  lcd.print("   Take Again   ");
  Serial.println("Remove finger");
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
    case FINGERPRINT_OK:
      Serial.println("Image taken");
      break;
    case FINGERPRINT_NOFINGER:
      Serial.print(".");
      break;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      break;
    case FINGERPRINT_IMAGEFAIL:
      Serial.println("Imaging error");
      break;
    default:
      Serial.println("Unknown error");
      break;
    }
  }

  p = finger.image2Tz(2);
  switch (p) {
    case FINGERPRINT_OK:
      Serial.println("Image converted");
      break;
    case FINGERPRINT_IMAGEMESS:
      Serial.println("Image too messy");
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      return p;
    case FINGERPRINT_FEATUREFAIL:
      Serial.println("Could not find fingerprint features");
      return p;
    case FINGERPRINT_INVALIDIMAGE:
      Serial.println("Could not find fingerprint features");
      return p;
    default:
      Serial.println("Unknown error");
      return p;
  }

  // OK converted!
  lcd.clear();
  lcd.setCursor(4,0);
  lcd.print("AI+X LAB");
  lcd.setCursor(0,1);
  lcd.print("  Store Finger! ");
  Serial.print("Creating model for #");  Serial.println(id);

  p = finger.createModel();
  if (p == FINGERPRINT_OK) {
    Serial.println("Prints matched!");
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    Serial.println("Communication error");
    return p;
  } else if (p == FINGERPRINT_ENROLLMISMATCH) {
    Serial.println("Fingerprints did not match");
    lcd.clear();
    lcd.setCursor(4,0);
    lcd.print("AI+X LAB");
    lcd.setCursor(0,1);
    lcd.print("Not Match Error!");
    delay(1000);
    return p;
  } else {
    Serial.println("Unknown error");
    return p;
  }

  Serial.print("ID "); Serial.println(id);
  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    Serial.println("Stored!");
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    Serial.println("Communication error");
    return p;
  } else if (p == FINGERPRINT_BADLOCATION) {
    Serial.println("Could not store in that location");
    return p;
  } else if (p == FINGERPRINT_FLASHERR) {
    Serial.println("Error writing to flash");
    return p;
  } else {
    Serial.println("Unknown error");
    return p;
  }
  delay(2000);
  return true;
}

// 지문 인식
uint8_t getFingerprintID() {
  uint8_t p = finger.getImage();
  switch (p) {
    case FINGERPRINT_OK:
      Serial.println("Image taken");
      break;
    case FINGERPRINT_NOFINGER:
      Serial.println("No finger detected");
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      return p;
    case FINGERPRINT_IMAGEFAIL:
      Serial.println("Imaging error");
      return p;
    default:
      Serial.println("Unknown error");
      return p;
  }

  // OK success!

  p = finger.image2Tz();
  switch (p) {
    case FINGERPRINT_OK:
      Serial.println("Image converted");
      break;
    case FINGERPRINT_IMAGEMESS:
      Serial.println("Image too messy");
      return p;
    case FINGERPRINT_PACKETRECIEVEERR:
      Serial.println("Communication error");
      return p;
    case FINGERPRINT_FEATUREFAIL:
      Serial.println("Could not find fingerprint features");
      return p;
    case FINGERPRINT_INVALIDIMAGE:
      Serial.println("Could not find fingerprint features");
      return p;
    default:
      Serial.println("Unknown error");
      return p;
  }

  // OK converted!
  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    Serial.println("Found a print match!");
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("AI+X LAB");
    lcd.setCursor(2,1);
    lcd.print("Welcome");
    lcd.setCursor(12,1);
    lcd.print(finger.fingerID - 100);
    delay(1000);
  } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
    Serial.println("Communication error");
    return p;
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println("Did not find a match");
    return p;
  } else {
    Serial.println("Unknown error");
    return p;
  }

  // found a match!
  Serial.print("Found ID #"); Serial.print(finger.fingerID);
  Serial.print(" with confidence of "); Serial.println(finger.confidence);

  return finger.fingerID;
}

// returns -1 if failed, otherwise returns ID #
int getFingerprintIDez() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK)  return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK)  return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK)  return -1;

  // found a match!
  Serial.print("Found ID #"); Serial.print(finger.fingerID);
  Serial.print(" with confidence of "); Serial.println(finger.confidence);
  return finger.fingerID;
}