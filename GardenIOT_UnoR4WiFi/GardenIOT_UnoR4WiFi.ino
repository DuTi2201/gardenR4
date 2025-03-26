// GardenIOT - Arduino Uno R4 WiFi

// === CẤU HÌNH GỠ LỖI ===
// Đặt thành true để tắt watchdog và bật chế độ gỡ lỗi
#define DEBUG_MODE true
// Đặt thành false để tắt watchdog hoàn toàn
#define ENABLE_WATCHDOG false

#include <WiFiS3.h>              // Thư viện WiFi cho Uno R4 WiFi
#include <PubSubClient.h>         // MQTT Client
#include <ArduinoJson.h>          // Xử lý JSON
#include <LiquidCrystal_I2C.h>    // Màn hình LCD
#include <DHT.h>                  // Cảm biến nhiệt độ, độ ẩm
#include <Wire.h>                 // I2C
#include "RTC.h"              // RTC cho đồng bộ thời gian
#include <EEPROM.h>         // Lưu trữ cấu hình
#include "WDT.h"           // Watchdog Timer

// === Khai báo cấu hình WiFi và MQTT ===
char mqtt_server[40] = "172.20.10.3"; // Địa chỉ MQTT server mặc định
int mqtt_port = 1883; // Cổng MQTT mặc định
char mqtt_user[20] = "";
char mqtt_pass[20] = "";
char deviceSerial[40] = "GARDEN8228";

// Thông tin WiFi
char ssid[32] = "Duong";
char password[32] = "88888888";
bool shouldSaveConfig = false;

// Chủ đề MQTT
String mqttTopicData;      // garden/{deviceSerial}/data
String mqttTopicCommand;   // garden/{deviceSerial}/command
String mqttTopicStatus;    // garden/{deviceSerial}/status
String mqttTopicCamera;    // garden/{deviceSerial}/camera
String mqttTopicSync;      // garden/{deviceSerial}/sync
String mqttTopicUpdate;    // garden/{deviceSerial}/update
String mqttTopicLogs;      // garden/{deviceSerial}/logs

// === Định nghĩa chân cắm ===
// Relay
#define FAN_PIN 8
#define LIGHT_PIN 9
#define PUMP_PIN 10
#define PUMP_2_PIN 11

// Cảm biến
#define DHTPIN 2
#define DHTTYPE DHT22
#define LIGHT_SENSOR_PIN A0
#define SOIL_HUMIDITY_SENSOR_PIN A1

// === Hằng số và cài đặt ===
// Hệ số hiệu chỉnh cảm biến
#define HUMIDITY_CORRECTION_FACTOR 0.8
#define TEMPERATURE_CORRECTION_FACTOR 0.9

// Thời gian
#define LCD_DISPLAY_DURATION 3000       // 3 giây hiển thị thông báo
#define SEND_INTERVAL 30000             // 30 giây gửi dữ liệu một lần
#define STATUS_CHECK_INTERVAL 1000      // 1 giây kiểm tra trạng thái
#define DISPLAY_CHANGE_INTERVAL 5000    // 5 giây thay đổi hiển thị LCD
#define MQTT_RECONNECT_INTERVAL 5000    // 5 giây kết nối lại MQTT
#define SCHEDULE_CHECK_INTERVAL 60000   // 1 phút kiểm tra lịch trình
#define STATUS_SEND_INTERVAL 30000      // 30 giây gửi trạng thái kết nối
#define MIN_CHANGE_INTERVAL 5000        // 5 giây giữa các thay đổi relay

// === Khởi tạo các đối tượng ===
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);
// RTC rtc; // Đã được khai báo trong thư viện RTC.h là đối tượng toàn cục RTC

// === Biến lưu trữ dữ liệu cảm biến ===
float temperature = 0;
float humidity = 0;
float lightPercent = 0;
float soilHumidityPercent = 0;
bool sensorError = false;

// === Thêm các biến cho lọc nhiễu và lấy trung bình ===
#define SENSOR_BUFFER_SIZE 5  // Kích thước bộ đệm cho giá trị trung bình
float tempBuffer[SENSOR_BUFFER_SIZE] = {0};
float humidityBuffer[SENSOR_BUFFER_SIZE] = {0};
float lightBuffer[SENSOR_BUFFER_SIZE] = {0};
float soilBuffer[SENSOR_BUFFER_SIZE] = {0};
int bufferIndex = 0;
bool bufferFilled = false;

// === Trạng thái thiết bị ===
bool fanStatus = false;
bool lightStatus = false;
bool pumpStatus = false;
bool pump2Status = false;
bool autoMode = false;

// === Biến thời gian ===
unsigned long lastSendTime = 0;
unsigned long lastStatusCheck = 0;
unsigned long notificationStartTime = 0;
unsigned long lastDisplayChange = 0;
unsigned long lastMQTTReconnect = 0;
unsigned long lastScheduleCheck = 0;
unsigned long lastStatusSent = 0;
unsigned long lastSuccessfulSensorRead = 0;
unsigned long lastFanChange = 0, lastLightChange = 0, lastPumpChange = 0, lastPump2Change = 0;
unsigned long lastActivityTime = 0;
unsigned long lastSyncRequest = 0;
const unsigned long SYNC_REQUEST_INTERVAL = 5000; // 5 giây
bool isInitialSyncCompleted = false;

// === Biến cho cơ chế backoff của WiFi và MQTT ===
unsigned long wifiReconnectInterval = 5000;   // Thời gian ban đầu: 5 giây
unsigned int wifiReconnectAttempts = 0;       // Số lần thử kết nối WiFi
const unsigned int MAX_WIFI_RECONNECT_INTERVAL = 5 * 60 * 1000; // Tối đa 5 phút

unsigned long mqttReconnectInterval = 5000;   // Thời gian ban đầu: 5 giây
unsigned int mqttReconnectAttempts = 0;       // Số lần thử kết nối MQTT
const unsigned int MAX_MQTT_RECONNECT_INTERVAL = 2 * 60 * 1000; // Tối đa 2 phút

// === Biến hiển thị LCD ===
bool isShowingNotification = false;
char lcdMessage[32] = "";
int displayMode = 0; // 0: Hiển thị cảm biến, 1: Hiển thị trạng thái thiết bị

// === Biến theo dõi trạng thái ===
unsigned long lastDataSent = 0;
int failedSensorReadCount = 0;
bool prevFanStatus = false;
bool prevLightStatus = false; 
bool prevPumpStatus = false;
bool prevPump2Status = false;
bool prevAutoMode = false;

// === Lập lịch ===
struct Schedule {
  int hour;
  int minute;
  bool active;
  int device; // 0: fan, 1: light, 2: pump, 3: pump2
  bool action; // true: on, false: off
};

// Tối đa 10 lịch trình
Schedule schedules[10];
int scheduleCount = 0;
bool schedulingMode = false;

// === Đồng bộ thời gian ===
const int timezone = 7; // GMT+7

// === Tạo ký tự custom cho LCD ===
byte Sun[8] = {
  0b00000, 0b10101, 0b01110, 0b11011, 0b01110, 0b10101, 0b00000, 0b00000
};

byte Plant[8] = {
  0b00100, 0b00110, 0b01110, 0b00100, 0b01110, 0b00100, 0b01010, 0b10001
};

byte Temp[8] = {
  0b00100, 0b01010, 0b01010, 0b01010, 0b01010, 0b10001, 0b10001, 0b01110
};

byte Drop[8] = {
  0b00100, 0b00100, 0b01010, 0b01010, 0b10001, 0b10001, 0b10001, 0b01110
};

// === Biến thời gian watchdog ===
unsigned long lastWatchdogReset = 0;
#define WATCHDOG_INTERVAL 5000 // Tăng thời gian reset watchdog từ 3s lên 5s
#define WATCHDOG_TIMEOUT 8000  // Tăng timeout watchdog từ 5s lên 8s

// Biến kiểm soát bật/tắt watchdog
bool watchdogEnabled = ENABLE_WATCHDOG && !DEBUG_MODE; // Được kiểm soát bởi cấu hình và chế độ gỡ lỗi

// Hàm mới để quản lý watchdog
void manageWatchdog() {
  if (!ENABLE_WATCHDOG) return; // Bỏ qua nếu watchdog bị tắt hoàn toàn
  
  unsigned long currentMillis = millis();
  
  if (watchdogEnabled) {
    // Chỉ refresh watchdog nếu đã được kích hoạt
    if (currentMillis - lastWatchdogReset >= WATCHDOG_INTERVAL) {
      WDT.refresh();
      lastWatchdogReset = currentMillis;
    }
  }
}

// Hàm mới để kích hoạt hoặc vô hiệu hóa watchdog
void setWatchdogState(bool enable) {
  if (!ENABLE_WATCHDOG) return; // Bỏ qua nếu watchdog bị tắt hoàn toàn
  
  watchdogEnabled = enable;
  WDT.refresh(); // Luôn refresh khi thay đổi trạng thái
  
  if (DEBUG_MODE) {
    Serial.print("Watchdog đã được ");
    Serial.println(enable ? "BẬT" : "TẮT");
  }
}

// === Cấu hình AP và Web Server ===
const char* AP_SSID = "GardenIOT_Config";  // Tên mạng WiFi của Access Point
const char* AP_PASSWORD = "12345678";      // Mật khẩu của Access Point
const int CONFIG_MODE_TIMEOUT = 300000;    // Thời gian timeout chế độ cấu hình (5 phút)
bool configMode = false;                   // Trạng thái chế độ cấu hình
unsigned long configModeStartTime = 0;     // Thời điểm bắt đầu chế độ cấu hình
WiFiServer webServer(80);                  // Web server trên cổng 80
IPAddress apIP(192, 168, 4, 1);            // Địa chỉ IP của AP
const int CONFIG_RESET_PIN = 3;            // Chân nút nhấn để vào chế độ cấu hình
bool shouldSaveWifiConfig = false;         // Biến đánh dấu cần lưu cấu hình
// Thêm biến để xác thực phiên
unsigned long lastAccessToken = 0;         // Token cho phiên hiện tại
bool accessTokenValid = false;             // Trạng thái xác thực

// EEPROM addresses
const int EEPROM_WIFI_SAVED_FLAG = 0;     // Địa chỉ EEPROM lưu cờ đã lưu WiFi (1 byte)
const int EEPROM_SSID_ADDR = 1;           // Địa chỉ EEPROM lưu SSID (32 bytes)
const int EEPROM_PASS_ADDR = 33;          // Địa chỉ EEPROM lưu mật khẩu (32 bytes)
const int EEPROM_MQTT_SERVER_ADDR = 65;   // Địa chỉ EEPROM lưu địa chỉ MQTT (40 bytes)
const int EEPROM_MQTT_PORT_ADDR = 105;    // Địa chỉ EEPROM lưu cổng MQTT (4 bytes)

// === Thêm các khai báo cho ESP32-CAM UART ===
// Định nghĩa chân UART kết nối với ESP32-CAM
#define ESP32CAM_RX_PIN 12  // Arduino TX -> ESP32 RX
#define ESP32CAM_TX_PIN 13  // Arduino RX <- ESP32 TX
#define ESP32CAM_UART_BAUD 115200  // Tốc độ UART

// Biến trạng thái ESP32-CAM
bool esp32CamConnected = false;
bool esp32CamStreaming = false;
unsigned long lastCameraCheck = 0;
unsigned long lastCameraCommand = 0;
String uartBuffer = "";
const unsigned long ESP32CAM_CHECK_INTERVAL = 10000; // 10 giây kiểm tra kết nối camera
const unsigned long CAMERA_RESPONSE_TIMEOUT = 5000;  // 5 giây timeout phản hồi camera

// Trạng thái hiển thị LCD bổ sung
const int DISPLAY_MODE_CAMERA = 3; // Chế độ hiển thị thông tin camera

// Khai báo trước các hàm
void mqttCallback(char* topic, byte* payload, unsigned int length);
void sendSensorData();
void readSensors();
void controlRelay(String device, bool turnOn, unsigned long& lastChange);
void updateMainDisplay();
void createCustomChars();
void setLCDBoot();
void processCommands();
void checkDeviceStatus();
void sendRelayStatus();
void connectMQTT();
void setupWiFi();
void getDeviceSerial();
void saveState();
void loadState();
void requestInitialSync();
void sendDeviceStatusToBackend();
void checkSchedules();
void logEvent(String event, String level = "INFO");
void sendLogToBackend(String message, String level = "INFO");
void startConfigMode();
void handleClient();
void loadWifiConfig();
void saveWifiConfig();
String buildConfigPage();
void resetDevice();
void initESP32CamUART();
void sendESP32CamCommand(String command);
void sendWiFiCredentialsToCamera();
void requestCameraCapture();
void controlCameraStream(bool enable);
void processESP32CamData(String data);

// Hàm ghi log trạng thái backoff
void logBackoffStatus();

void setup() {
  // Khởi tạo Serial monitor
  Serial.begin(115200);
  
  // Hiển thị thông báo khởi động
  Serial.println("Arduino Uno R4 WiFi - Smart Garden");
  Serial.println("=================================");
  
  if (DEBUG_MODE) {
    Serial.println("CHÚ Ý: Đang chạy ở CHẾ ĐỘ GỠ LỖI - Watchdog bị tắt!");
  }
  
  // Khởi tạo EEPROM
  EEPROM.begin();
  
  // Khởi tạo watchdog timer - nhưng chưa kích hoạt
  if (ENABLE_WATCHDOG) {
    if (WDT.begin(WATCHDOG_TIMEOUT)) {
      Serial.println("Watchdog timer đã được khởi tạo");
      WDT.refresh(); // Refresh ngay sau khi khởi tạo
      
      // Watchdog bị tắt ban đầu, sẽ bật sau khi thiết lập thành công
      watchdogEnabled = !DEBUG_MODE; // Luôn tắt trong chế độ gỡ lỗi
      Serial.println("Watchdog đang " + String(watchdogEnabled ? "hoạt động" : "bị vô hiệu hóa"));
    } else {
      Serial.println("Lỗi khởi tạo watchdog timer");
    }
  } else {
    Serial.println("Watchdog timer bị tắt hoàn toàn theo cấu hình");
  }
  
  // Khởi tạo LCD
  Wire.begin();
  lcd.init();
  lcd.backlight();
  createCustomChars();
  setLCDBoot();
  
  // Thiết lập chân relay là OUTPUT
  pinMode(FAN_PIN, OUTPUT);
  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(PUMP_PIN, OUTPUT);
  pinMode(PUMP_2_PIN, OUTPUT);
  
  // Tắt tất cả relay ban đầu (HIGH là TẮT đối với relay active LOW)
  digitalWrite(FAN_PIN, HIGH);
  digitalWrite(LIGHT_PIN, HIGH);
  digitalWrite(PUMP_PIN, HIGH);
  digitalWrite(PUMP_2_PIN, HIGH);
  
  // Đảm bảo trạng thái ban đầu phù hợp với điều khiển relay
  fanStatus = false;
  lightStatus = false;
  pumpStatus = false;
  pump2Status = false;
  
  // Khởi tạo cảm biến
  dht.begin();
  
  // Khởi tạo RTC
  RTC.begin();
  
  // Đặt thời gian mặc định cho RTC nếu chưa được cài đặt
  RTCTime currentTime;
  RTC.getTime(currentTime);
  
  // Nếu thời gian chưa được đặt (năm < 2000), đặt thời gian mặc định
  if (currentTime.getYear() < 2000) {
    Serial.println("RTC chưa được đặt thời gian, thiết lập thời gian mặc định");
    
    // Tạo đối tượng RTCTime với thời gian mặc định: 1/1/2025 12:00:00
    RTCTime timeToSet;
    timeToSet.setDayOfMonth(1);
    timeToSet.setMonthOfYear((Month)1); // Tháng 1 (January)
    timeToSet.setYear(2025);
    timeToSet.setHour(12);
    timeToSet.setMinute(0);
    timeToSet.setSecond(0);
    timeToSet.setDayOfWeek((DayOfWeek)0); // Sunday
    
    RTC.setTime(timeToSet);
  }
  
  // Tải trạng thái từ Flash
  loadState();
  
  // Thiết lập nút nhấn cho chế độ cấu hình
  pinMode(CONFIG_RESET_PIN, INPUT_PULLUP);
  
  // Tải cấu hình WiFi từ EEPROM
  loadWifiConfig();
  
  // Kiểm tra nút nhấn để vào chế độ cấu hình
  if (digitalRead(CONFIG_RESET_PIN) == LOW) {
    startConfigMode();
  } else {
    // Thiết lập WiFi
    setupWiFi();
  }
  
  // Lấy mã serial thiết bị
  getDeviceSerial();
  
  // Thiết lập MQTT
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(mqttCallback);
  
  // Kết nối MQTT
  connectMQTT();
  
  // Đọc cảm biến
  readSensors();
  
  // Đặt trạng thái đồng bộ ban đầu là false - sẽ gửi yêu cầu đồng bộ trong loop
  isInitialSyncCompleted = false;
  lastSyncRequest = 0;
  
  // Khởi tạo thời gian hoạt động
  lastActivityTime = millis();
  
  logEvent("Hệ thống khởi động hoàn tất, chờ đồng bộ trạng thái thiết bị từ backend...");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("He thong san sang");
  lcd.setCursor(0, 1);
  lcd.print("Dang dong bo...");
  delay(2000);
  
  // Hiển thị màn hình chính
  updateMainDisplay();
  
  // Khởi tạo kết nối UART với ESP32-CAM
  initESP32CamUART();
  
  // Chỉ kích hoạt watchdog nếu không ở chế độ gỡ lỗi
  if (ENABLE_WATCHDOG && !DEBUG_MODE) {
    setWatchdogState(true);
    Serial.println("Watchdog đã được kích hoạt");
  }
}

void loop() {
  // Thêm dòng này để khai báo biến currentMillis
  unsigned long currentMillis = millis();
  
  // Luôn refresh watchdog để tránh reset
  if (ENABLE_WATCHDOG) {
    WDT.refresh();
  }
  
  // Quản lý watchdog - thay thế đoạn code cũ
  manageWatchdog();
  
  // Thêm kiểm tra LCD định kỳ
  static unsigned long lastLCDCheck = 0;
  if (currentMillis - lastLCDCheck >= 30000) { // Kiểm tra mỗi 30 giây
    if (!isLCDWorking()) {
      resetLCD();
      updateMainDisplay(); // Cập nhật lại màn hình sau khi reset
    }
    lastLCDCheck = currentMillis;
  }
  
  // Xử lý kết nối WiFi
  if (WiFi.status() != WL_CONNECTED) {
    logEvent("Mất kết nối WiFi, đang thử kết nối lại...", "WARNING");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Mat ket noi WiFi");
    lcd.setCursor(0, 1);
    lcd.print("Dang ket noi lai...");
    
    // Chỉ thử kết nối lại nếu đã đến thời gian backoff
    static unsigned long lastWiFiAttempt = 0;
    if (currentMillis - lastWiFiAttempt >= wifiReconnectInterval) {
      WDT.refresh(); // Refresh watchdog trước khi kết nối WiFi
      setupWiFi();
      lastWiFiAttempt = currentMillis;
      WDT.refresh(); // Refresh watchdog sau khi kết nối WiFi
    } else {
      // Hiển thị thời gian còn lại cho lần thử kết nối tiếp theo
      int remainingTime = (wifiReconnectInterval - (currentMillis - lastWiFiAttempt)) / 1000;
      lcd.setCursor(0, 1);
      lcd.print("Thu lai sau: ");
      lcd.print(remainingTime);
      lcd.print("s ");
      delay(500); // Giảm delay từ 1000ms xuống 500ms để tránh watchdog timeout
      WDT.refresh(); // Refresh watchdog trong delay
    }
  }
  
  // Xử lý client MQTT
  if (!mqttClient.connected()) {
    // Chỉ thử kết nối lại nếu đã đến thời gian backoff
    if (currentMillis - lastMQTTReconnect >= mqttReconnectInterval) {
      connectMQTT();
      lastMQTTReconnect = currentMillis;
    } else if (wifiReconnectAttempts == 0) { // Chỉ hiển thị khi WiFi đã kết nối
      // Hiển thị thời gian còn lại cho lần thử kết nối MQTT tiếp theo
      static bool showMQTTRetryInfo = false;
      
      if (!showMQTTRetryInfo) {
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("MQTT mat ket noi");
        showMQTTRetryInfo = true;
      }
      
      int remainingTime = (mqttReconnectInterval - (currentMillis - lastMQTTReconnect)) / 1000;
      lcd.setCursor(0, 1);
      lcd.print("Thu lai sau: ");
      lcd.print(remainingTime);
      lcd.print("s ");
      
      // Chỉ cập nhật màn hình mỗi 5 giây để không ảnh hưởng đến loop
      if (currentMillis % 5000 < 100) { // Cập nhật trong khoảng 100ms mỗi 5 giây
        showMQTTRetryInfo = false;
      }
    }
  } else {
    mqttClient.loop();
  }
  
  // Phần còn lại của hàm loop không thay đổi
  
  // Yêu cầu đồng bộ trạng thái ban đầu sau khi kết nối MQTT thành công
  if (!isInitialSyncCompleted && mqttClient.connected()) {
    if (currentMillis - lastSyncRequest >= SYNC_REQUEST_INTERVAL) {
      requestInitialSync();
      lastSyncRequest = currentMillis;
    }
  }
  
  // Đọc dữ liệu cảm biến định kỳ
  if (currentMillis - lastSendTime >= SEND_INTERVAL) {
    readSensors();
    
    // In ra thông tin cảm biến
    Serial.println("==== THÔNG TIN CẢM BIẾN ====");
    Serial.println("Nhiệt độ: " + String(temperature) + "°C");
    Serial.println("Độ ẩm: " + String(humidity) + "%");
    Serial.println("Ánh sáng: " + String(lightPercent) + "%");
    Serial.println("Độ ẩm đất: " + String(soilHumidityPercent) + "%");
    Serial.println("Trạng thái lỗi: " + String(sensorError ? "CÓ" : "KHÔNG"));
    Serial.println("============================");
    
    lastSendTime = currentMillis;
  }
  
  // Kiểm tra và gửi dữ liệu cảm biến định kỳ
  if (currentMillis - lastDataSent > SEND_INTERVAL) {
    // Chỉ gửi dữ liệu khi đã kết nối MQTT
    if (mqttClient.connected()) {
      sendSensorData();
      lastDataSent = currentMillis;
    }
  }
  
  // Kiểm tra trạng thái relay theo định kỳ
  if (currentMillis - lastStatusCheck >= STATUS_CHECK_INTERVAL) {
    checkDeviceStatus();
    lastStatusCheck = currentMillis;
  }
  
  // Kiểm tra lịch trình theo định kỳ
  if (currentMillis - lastScheduleCheck >= SCHEDULE_CHECK_INTERVAL) {
    if (autoMode) {
      checkSchedules();
    }
    lastScheduleCheck = currentMillis;
  }
  
  // Gửi trạng thái kết nối định kỳ
  if (currentMillis - lastStatusSent > STATUS_SEND_INTERVAL) {
    sendConnectionStatus();
    lastStatusSent = currentMillis;
    
    // Ghi log trạng thái kết nối và cơ chế backoff
    logBackoffStatus();
  }
  
  // Kiểm tra và cập nhật màn hình LCD
  if (isShowingNotification) {
    if (currentMillis - notificationStartTime >= LCD_DISPLAY_DURATION) {
      isShowingNotification = false;
      updateMainDisplay();
    }
  } else if (currentMillis - lastDisplayChange >= DISPLAY_CHANGE_INTERVAL) {
    // Thay đổi chế độ hiển thị LCD (0->1->2->3->0)
    displayMode = (displayMode + 1) % 4; // Thay đổi từ %3 thành %4 để bao gồm chế độ camera
    updateMainDisplay();
    lastDisplayChange = currentMillis;
  }
  
  // Điều khiển tự động
  autoControl();
  
  // Xử lý lệnh từ Serial
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    processSerialCommand(command);
  }
  
  // Xử lý dữ liệu từ ESP32-CAM qua UART
  while (Serial1.available()) {
    char c = Serial1.read();
    if (c == '\n') {
      if (uartBuffer.length() > 0) {
        processESP32CamData(uartBuffer);
        uartBuffer = "";
      }
    } else if (c != '\r') {
      uartBuffer += c;
    }
  }
  
  // Kiểm tra kết nối ESP32-CAM định kỳ
  if (currentMillis - lastCameraCheck > ESP32CAM_CHECK_INTERVAL) {
    if (!esp32CamConnected) {
      // Thử kết nối lại nếu mất kết nối
      sendESP32CamCommand("{\"action\":\"check_connection\"}");
      Serial.println("Kiểm tra kết nối ESP32-CAM...");
    } else {
      // Gửi thông tin WiFi nếu đã kết nối ESP32-CAM nhưng WiFi thay đổi
      sendWiFiCredentialsToCamera();
    }
    lastCameraCheck = currentMillis;
  }
  
  // Kiểm tra timeout cho ESP32-CAM
  checkCameraTimeout();
  
  // Nếu đang ở chế độ cấu hình
  if (configMode) {
    WDT.refresh(); // Refresh watchdog trong chế độ cấu hình
    handleClient();
    
    // Kiểm tra xem web server có hoạt động không
    static unsigned long lastServerCheck = 0;
    if (currentMillis - lastServerCheck > 10000) { // Kiểm tra mỗi 10 giây
      Serial.println("Web server đang chạy ở địa chỉ: " + WiFi.localIP().toString());
      Serial.println("Tên mạng: " + String(AP_SSID));
      Serial.println("Mật khẩu: " + String(AP_PASSWORD));
      lastServerCheck = currentMillis;
    }
    
    // Kiểm tra thời gian timeout của chế độ cấu hình
    if (currentMillis - configModeStartTime > CONFIG_MODE_TIMEOUT) {
      configMode = false;
      
      if (shouldSaveWifiConfig) {
        saveWifiConfig();
        shouldSaveWifiConfig = false;
      }
      
      resetDevice();  // Khởi động lại thiết bị
    }
    return;  // Thoát khỏi loop nếu đang ở chế độ cấu hình
  }
}

// === Hàm xử lý màn hình LCD ===

// Hàm tạo Custom Character cho LCD
void createCustomChars() {
  // Reset LCD trước khi tạo custom chars
  lcd.init();  // Khởi tạo lại LCD
  lcd.backlight();
  delay(100);  // Chờ cho LCD ổn định
  
  lcd.createChar(0, Sun);   // Biểu tượng ánh sáng
  lcd.createChar(1, Plant); // Biểu tượng cây
  lcd.createChar(2, Temp);  // Biểu tượng nhiệt độ
  lcd.createChar(3, Drop);  // Biểu tượng nước (độ ẩm)
}

// Hàm khởi động LCD
void setLCDBoot() {
  lcd.clear();
  // Thêm bước kiểm tra và reset LCD nếu cần
  if (!isLCDWorking()) {
    resetLCD();
  }
  
  // Màn hình chào mừng - cải thiện bố cục
  lcd.setCursor(0, 0);
  lcd.print("\x00 SMART GARDEN \x00");
  lcd.setCursor(2, 1);
  lcd.print("KHOI DONG...");
  delay(2000);
  
  // Hiển thị màn hình chính
  updateMainDisplay();
}

// Thêm hàm kiểm tra LCD có đang hoạt động bình thường hay không
bool isLCDWorking() {
  // Thử viết một chuỗi kiểm tra lên LCD
  char testChar = 'A';
  
  // Lưu vị trí hiện tại để khôi phục sau khi kiểm tra
  lcd.setCursor(15, 1);
  lcd.print(testChar);
  delay(5);
  
  // Thực hiện việc đọc dữ liệu từ địa chỉ I2C của LCD
  Wire.beginTransmission(0x27);
  byte error = Wire.endTransmission();
  
  // Xóa ký tự kiểm tra
  lcd.setCursor(15, 1);
  lcd.print(" ");
  
  // Kiểm tra lỗi I2C: 0 = thành công, khác 0 = lỗi
  if (error != 0) {
    Serial.println("Phát hiện lỗi kết nối LCD: " + String(error));
    return false;
  }
  
  // Kiểm tra việc reset này khi nào có thể cần thiết
  // Thực hiện thêm một bước kiểm tra thông qua dữ liệu trên màn hình
  static int errorCount = 0;
  
  // Đếm số lần có lỗi, nếu quá 3 lần thì kết luận là LCD đang gặp vấn đề
  if (error != 0) {
    errorCount++;
    if (errorCount >= 3) {
      errorCount = 0; // Reset bộ đếm
      return false;
    }
  } else {
    // Giảm bộ đếm lỗi nếu liên tục không có lỗi
    if (errorCount > 0) errorCount--;
  }
  
  return true;
}

// Thêm hàm reset LCD khi gặp lỗi
void resetLCD() {
  Wire.end();
  delay(100);
  Wire.begin();
  delay(100);
  lcd.init();
  lcd.backlight();
  delay(200);
  
  // Log sự kiện
  Serial.println("Đã reset LCD do phát hiện lỗi hiển thị");
  logEvent("Reset LCD do phát hiện lỗi hiển thị", "WARNING");
}

// Cập nhật màn hình chính
void updateMainDisplay() {
  lcd.clear();
  
  if (displayMode == 0) {
    // Hiển thị dữ liệu cảm biến - Bố cục mới, gọn gàng hơn
    // Nhiệt độ - Dòng 1, bên trái
    lcd.setCursor(0, 0);
    lcd.write(byte(2)); // Biểu tượng nhiệt độ
    float roundedTemp = round(temperature * 10) / 10.0;
    lcd.print(roundedTemp < 10 ? " " : "");
    lcd.print(roundedTemp, 1);
    lcd.print("\xDF""C"); // Ký tự độ C chuẩn

    // Độ ẩm không khí - Dòng 1, bên phải
    lcd.setCursor(9, 0);
    lcd.write(byte(3)); // Biểu tượng độ ẩm
    float roundedHum = round(humidity * 10) / 10.0;
    lcd.print(roundedHum < 10 ? " " : "");
    lcd.print(roundedHum, 1);
    lcd.print("%");
    
    // Ánh sáng - Dòng 2, bên trái
    lcd.setCursor(0, 1);
    lcd.write(byte(0)); // Biểu tượng ánh sáng
    int roundedLight = round(lightPercent);
    lcd.print(roundedLight < 10 ? " " : "");
    lcd.print(roundedLight);
    lcd.print("%");
    
    // Độ ẩm đất - Dòng 2, bên phải
    lcd.setCursor(9, 1);
    lcd.write(byte(1)); // Biểu tượng cây (độ ẩm đất)
    int roundedSoil = round(soilHumidityPercent);
    lcd.print(roundedSoil < 10 ? " " : "");
    lcd.print(roundedSoil);
    lcd.print("%");
  } else if (displayMode == 1) {
    // Hiển thị trạng thái thiết bị quạt và đèn - Bố cục cải tiến
    // Tiêu đề
    lcd.setCursor(0, 0);
    lcd.write(byte(0)); // Biểu tượng trang thiết bị
    lcd.print("THIET BI");
    
    // Trạng thái
    lcd.setCursor(0, 1);
    lcd.print("Quat:");
    lcd.print(fanStatus ? "ON " : "OFF");
    lcd.setCursor(9, 1);
    lcd.print("Den:");
    lcd.print(lightStatus ? "ON" : "OFF");
  } else if (displayMode == 2) {
    // Hiển thị trạng thái máy bơm 1 và 2 - Bố cục cải tiến
    // Tiêu đề
    lcd.setCursor(0, 0);
    lcd.write(byte(3)); // Biểu tượng nước
    lcd.print(" MAY BOM");
    
    // Trạng thái
    lcd.setCursor(0, 1);
    lcd.print("Nuoc:");
    lcd.print(pumpStatus ? "ON " : "OFF");
    lcd.setCursor(9, 1);
    lcd.print("DD:");
    lcd.print(pump2Status ? "ON" : "OFF");
  } else if (displayMode == 3) {
    // Hiển thị trạng thái camera - Bố cục cải tiến
    // Tiêu đề
    lcd.setCursor(0, 0);
    lcd.print("CAMERA STATUS");
    
    // Trạng thái
    lcd.setCursor(0, 1);
    if (!esp32CamConnected) {
      lcd.print("Khong ket noi");
    } else {
      lcd.print("OK");
      lcd.setCursor(4, 1);
      lcd.print(esp32CamStreaming ? "STREAM:ON" : "STREAM:OFF");
    }
  }
}

// === Lịch trình ===

// Kiểm tra lịch trình
void checkSchedules() {
  if (!schedulingMode || !autoMode) return;
  
  // Lấy thời gian hiện tại từ RTC
  RTCTime currentTime;
  RTC.getTime(currentTime);
  
  // Đảm bảo RTC đã được khởi tạo đúng cách
  if (currentTime.getYear() < 2000) {
    Serial.println("Lỗi: RTC chưa được đặt thời gian hoặc pin dự phòng yếu");
    return;
  }
  
  int currentHour = currentTime.getHour();
  int currentMinute = currentTime.getMinutes();
  
  Serial.print("Kiểm tra lịch trình: ");
  Serial.print(currentHour);
  Serial.print(":");
  Serial.print(currentMinute);
  Serial.print(" - Số lịch trình: ");
  Serial.println(scheduleCount);
  
  for (int i = 0; i < scheduleCount; i++) {
    if (schedules[i].active && 
        schedules[i].hour == currentHour && 
        schedules[i].minute == currentMinute) {
      
      // Thực hiện hành động theo lịch trình
      String device;
      switch (schedules[i].device) {
        case 0: device = "FAN"; break;
        case 1: device = "LIGHT"; break;
        case 2: device = "PUMP"; break;
        case 3: device = "PUMP_2"; break;
        default: device = "UNKNOWN"; break;
      }
      
      if (device != "UNKNOWN") {
        unsigned long& lastChange = (schedules[i].device == 0) ? lastFanChange : 
                                  ((schedules[i].device == 1) ? lastLightChange : 
                                  ((schedules[i].device == 2) ? lastPumpChange : lastPump2Change));
        
        Serial.print("Thực hiện lịch trình: ");
        Serial.print(schedules[i].device == 0 ? "Quạt" : 
                    (schedules[i].device == 1 ? "Đèn" : 
                    (schedules[i].device == 2 ? "Máy bơm 1" : "Máy bơm 2")));
        Serial.print(" ");
        Serial.println(schedules[i].action ? "BẬT" : "TẮT");
        
        controlRelay(device, schedules[i].action, lastChange);
      }
    }
  }
}

// Thêm lịch trình mới
bool addSchedule(int hour, int minute, int device, bool action) {
  if (scheduleCount >= 10) return false;
  
  schedules[scheduleCount].hour = hour;
  schedules[scheduleCount].minute = minute;
  schedules[scheduleCount].active = true;
  schedules[scheduleCount].device = device;
  schedules[scheduleCount].action = action;
  
  scheduleCount++;
  return true;
}

// === Chức năng ghi log ===
void logEvent(String event, String level) {
  String logEntry = String(millis() / 1000) + " [" + level + "] " + event;
  Serial.println(logEntry);
  
  // Gửi log lên backend
  sendLogToBackend(event, level);
}

// Hàm gửi log lên backend qua MQTT
void sendLogToBackend(String message, String level) {
  // Kiểm tra kết nối MQTT
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  
  // Nếu vẫn không thể kết nối, thoát
  if (!mqttClient.connected()) return;
  
  // Sử dụng StaticJsonDocument thay vì DynamicJsonDocument
  StaticJsonDocument<256> doc;
  doc["device_serial"] = deviceSerial;
  doc["timestamp"] = millis();
  doc["level"] = level;
  doc["message"] = message;
  
  String jsonStr;
  serializeJson(doc, jsonStr);
  
  // Gửi thông tin log đến topic logs
  mqttClient.publish(mqttTopicLogs.c_str(), jsonStr.c_str());
}

// === Xử lý lệnh từ Serial ===
void processSerialCommand(String command) {
  if (command == "info") {
    Serial.println("==== THÔNG TIN CẤU HÌNH ====");
    Serial.print("MQTT Server: ");
    Serial.println(mqtt_server);
    Serial.print("MQTT Port: ");
    Serial.println(mqtt_port);
    Serial.print("Device Serial: ");
    Serial.println(deviceSerial);
    Serial.print("WiFi IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("WiFi SSID: ");
    Serial.println(WiFi.SSID());
    Serial.print("MQTT Connected: ");
    Serial.println(mqttClient.connected() ? "Yes" : "No");
    if (!mqttClient.connected()) {
      Serial.print("MQTT Error code: ");
      Serial.println(mqttClient.state());
    }
    Serial.println("============================");
  }
  else if (command == "conn" || command == "connection") {
    // Hiển thị thông tin kết nối chi tiết
    logBackoffStatus();
  }
  else if (command == "help") {
    Serial.println("==== CÁC LỆNH CÓ SẴN ====");
    Serial.println("info - Hiển thị thông tin cấu hình");
    Serial.println("conn - Hiển thị thông tin kết nối chi tiết");
    Serial.println("help - Hiển thị danh sách lệnh");
    Serial.println("fan on - Bật quạt");
    Serial.println("fan off - Tắt quạt");
    Serial.println("light on - Bật đèn");
    Serial.println("light off - Tắt đèn");
    Serial.println("pump on - Bật máy bơm 1");
    Serial.println("pump off - Tắt máy bơm 1");
    Serial.println("pump2 on - Bật máy bơm 2");
    Serial.println("pump2 off - Tắt máy bơm 2");
    Serial.println("auto on - Bật chế độ tự động");
    Serial.println("auto off - Tắt chế độ tự động");
    Serial.println("reset - Khởi động lại thiết bị");
    Serial.println("==========================");
  }
  else if (command == "fan on") {
    controlRelay("FAN", true, lastFanChange);
  }
  else if (command == "fan off") {
    controlRelay("FAN", false, lastFanChange);
  }
  else if (command == "light on") {
    controlRelay("LIGHT", true, lastLightChange);
  }
  else if (command == "light off") {
    controlRelay("LIGHT", false, lastLightChange);
  }
  else if (command == "pump on") {
    controlRelay("PUMP", true, lastPumpChange);
  }
  else if (command == "pump off") {
    controlRelay("PUMP", false, lastPumpChange);
  }
  else if (command == "pump2 on") {
    controlRelay("PUMP_2", true, lastPump2Change);
  }
  else if (command == "pump2 off") {
    controlRelay("PUMP_2", false, lastPump2Change);
  }
  else if (command == "auto on") {
    prevAutoMode = autoMode;
    autoMode = true;
    saveState();
    if (prevAutoMode != autoMode) {
      sendDeviceStatusToBackend();
    }
    Serial.println("Chế độ tự động đã được BẬT");
  }
  else if (command == "auto off") {
    prevAutoMode = autoMode;
    autoMode = false;
    saveState();
    if (prevAutoMode != autoMode) {
      sendDeviceStatusToBackend();
    }
    Serial.println("Chế độ tự động đã được TẮT");
  }
  else if (command == "reset") {
    Serial.println("Khởi động lại thiết bị sau 3 giây...");
    delay(3000);
    // Mã khởi động lại cho Arduino Uno R4 WiFi
    // NVIC_SystemReset();
  }
  else if (command == "lcd reset") {
    Serial.println("Đang reset LCD...");
    resetLCD();
    createCustomChars();
    updateMainDisplay();
    Serial.println("Reset LCD hoàn tất");
  }
  else if (command == "cam photo") {
    requestCameraCapture();
    Serial.println("Đã gửi lệnh chụp ảnh tới ESP32-CAM");
  }
  else if (command == "cam stream on") {
    controlCameraStream(true);
    Serial.println("Đã bật streaming camera");
  }
  else if (command == "cam stream off") {
    controlCameraStream(false);
    Serial.println("Đã tắt streaming camera");
  }
  else if (command == "cam status") {
    Serial.println("Trạng thái ESP32-CAM:");
    Serial.print("Kết nối: ");
    Serial.println(esp32CamConnected ? "OK" : "Không kết nối");
    Serial.print("Streaming: ");
    Serial.println(esp32CamStreaming ? "Đang streaming" : "Không streaming");
  }
} 

// === Kết nối WiFi ===
void setupWiFi() {
  delay(10);
  
  // Hiển thị thông báo kết nối WiFi với bố cục mới
  lcd.clear();
  lcd.setCursor(1, 0);
  lcd.print("Dang ket noi");
  lcd.setCursor(5, 1);
  lcd.print("WIFI");
  
  // Kiểm tra xem đã lưu cấu hình chưa
  if (strlen(ssid) == 0) {
    // Hiển thị thông báo chưa có WiFi với bố cục mới
    lcd.clear();
    lcd.setCursor(2, 0);
    lcd.print("CHUA CO WiFi");
    lcd.setCursor(1, 1);
    lcd.print("CHE DO CAU HINH");
    delay(2000);
    startConfigMode();
    return;
  }
  


  
  Serial.print("Kết nối tới WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  // Chờ kết nối thành công
  int dots = 0;
  int maxDots = 10;
  unsigned long startAttemptTime = millis();
  
  // Đặt thời gian timeout dựa trên số lần thử tối thiểu là 10 giây
  unsigned long attemptTimeout = max(10000UL, wifiReconnectInterval);
  
  // Đợi kết nối và hiển thị hiệu ứng đang kết nối
  while (WiFi.status() != WL_CONNECTED && (millis() - startAttemptTime < attemptTimeout)) {
    delay(500);
    Serial.print(".");
    dots++;
    
    // Hiệu ứng "đang kết nối" trên LCD
    lcd.setCursor(15, 1);
    lcd.print(dots % 2 == 0 ? "." : " ");
    
    // Làm mới watchdog trong quá trình kết nối WiFi
    if (ENABLE_WATCHDOG) {
      WDT.refresh();
    }
  }
  
  // Hiển thị kết quả kết nối
  if (WiFi.status() == WL_CONNECTED) {
    // Đặt lại thông số backoff khi kết nối thành công
    wifiReconnectInterval = 5000; // Reset về thời gian ban đầu
    wifiReconnectAttempts = 0;    // Reset số lần thử
    
    // Hiển thị thông báo kết nối thành công
    lcd.clear();
    lcd.setCursor(3, 0);
    lcd.print("WIFI OK!");
    lcd.setCursor(0, 1);
    
    // Hiển thị địa chỉ IP căn giữa
    String ipStr = WiFi.localIP().toString();
    int startPos = max(0, (16 - ipStr.length()) / 2);
    lcd.setCursor(startPos, 1);
    lcd.print(ipStr);
    
    Serial.println("\nĐã kết nối WiFi!");
    Serial.print("Địa chỉ IP: ");
    Serial.println(WiFi.localIP());
    
    delay(2000);
    
    // Kích hoạt lại watchdog sau khi kết nối thành công
    watchdogEnabled = true;
  } else {
    Serial.println("\nKhông thể kết nối WiFi sau thời gian chờ");
    
    // Tăng số lần thử và áp dụng cơ chế backoff
    wifiReconnectAttempts++;
    
    // Tăng thời gian chờ theo cấp số nhân (nhân đôi thời gian)
    wifiReconnectInterval = min(wifiReconnectInterval * 2, (unsigned long)MAX_WIFI_RECONNECT_INTERVAL);
    
    Serial.print("Lần thử kết nối tiếp theo sau: ");
    Serial.print(wifiReconnectInterval / 1000);
    Serial.println(" giây");
    
    // Hiển thị thông báo lỗi kết nối
    lcd.clear();
    lcd.setCursor(3, 0);
    lcd.print("WIFI LOI!");
    lcd.setCursor(2, 1);
    lcd.print("THU LAI: ");
    lcd.print(wifiReconnectInterval / 1000);
    lcd.print("s");
    
    // Nếu quá nhiều lần thử thất bại liên tiếp (ví dụ: 10 lần)
    if (wifiReconnectAttempts >= 10) {
      Serial.println("Quá nhiều lần thử thất bại, chuyển sang chế độ cấu hình");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("QUA NHIEU LAN THU");
      lcd.setCursor(1, 1);
      lcd.print("CAU HINH LAI...");
      delay(2000);
      
      // Chuyển sang chế độ cấu hình
      startConfigMode();
    }
  }
  
  // Cập nhật màn hình chính sau khi thiết lập WiFi
  updateMainDisplay();
}

// Lưu cấu hình WiFi
void saveWiFiConfig() {
  // Trong ứng dụng thực tế, bạn sẽ lưu vào Flash
  Serial.println("Đã lưu cấu hình WiFi");
}

// === Kết nối MQTT ===
void connectMQTT() {
  // Kiểm tra kết nối WiFi
  if (WiFi.status() != WL_CONNECTED) {
    return; // Không kết nối MQTT nếu WiFi chưa kết nối
  }
  
  // Thiết lập chủ đề MQTT 
  mqttTopicData = "garden/" + String(deviceSerial) + "/data";
  mqttTopicCommand = "garden/" + String(deviceSerial) + "/command";
  mqttTopicStatus = "garden/" + String(deviceSerial) + "/status";
  mqttTopicCamera = "garden/" + String(deviceSerial) + "/camera";
  mqttTopicSync = "garden/" + String(deviceSerial) + "/sync";
  mqttTopicUpdate = "garden/" + String(deviceSerial) + "/update";
  mqttTopicLogs = "garden/" + String(deviceSerial) + "/logs";
  
  // Kiểm tra xem Server, Port, ClientID có hợp lệ
  if (strlen(mqtt_server) == 0 || mqtt_port == 0 || strlen(deviceSerial) == 0) {
    Serial.println("Cấu hình MQTT không hợp lệ");
    return;
  }
  
  if (mqttClient.connected()) {
    return; // Đã kết nối MQTT
  }
  
  // Hiển thị thông báo đang kết nối MQTT - giao diện mới
  lcd.clear();
  lcd.setCursor(2, 0);
  lcd.print("KET NOI MQTT");
  lcd.setCursor(1, 1);
  lcd.print("DANG XU LY...");
  
  Serial.print("Kết nối MQTT đến server: ");
  Serial.println(mqtt_server);
  
  Serial.print("Port: ");
  Serial.println(mqtt_port);
  
  // Thiết lập server và hàm callback MQTT
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(mqttCallback);
  
  // Tạo tên client ID từ deviceSerial
  String clientId = "GardenUnoR4-" + String(deviceSerial);
  
  Serial.print("Đang kết nối MQTT với ClientID: ");
  Serial.println(clientId);
  
  // Kết nối với broker
  if (mqttClient.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
    // Kết nối thành công
    Serial.println("Đã kết nối MQTT broker!");
    
    // Reset giá trị backoff
    mqttReconnectInterval = 5000; // Reset về thời gian ban đầu
    mqttReconnectAttempts = 0;    // Reset số lần thử
    
    // Đăng ký các topic
    mqttClient.subscribe(mqttTopicCommand.c_str());
    mqttClient.subscribe(mqttTopicCamera.c_str());
    
    // Gửi thông báo kết nối
    String statusMsg = "{\"status\":\"connected\",\"timestamp\":" + String(millis()) + "}";
    mqttClient.publish(mqttTopicStatus.c_str(), statusMsg.c_str());
    
    // Gửi thông tin trạng thái ban đầu
    sendDeviceStatusToBackend();
    
    // Gửi yêu cầu đồng bộ ban đầu (nếu cần)
    if (!isInitialSyncCompleted) {
      requestInitialSync();
    }
    
    // Hiển thị thông báo kết nối thành công
    lcd.clear();
    lcd.setCursor(4, 0);
    lcd.print("MQTT OK");
    lcd.setCursor(0, 1);
    // Hiển thị tên broker ngắn gọn
    String brokerDisplay = String(mqtt_server);
    if (brokerDisplay.length() > 16) {
      brokerDisplay = brokerDisplay.substring(0, 16);
    }
    // Căn giữa tên broker
    int startPos = max(0, (16 - brokerDisplay.length()) / 2);
    lcd.setCursor(startPos, 1);
    lcd.print(brokerDisplay);
    
    delay(2000); // Hiển thị thông báo trong 2 giây
    
    // Cập nhật màn hình chính
    updateMainDisplay();
  } else {
    // Kết nối thất bại
    int mqttState = mqttClient.state();
    Serial.print("Không thể kết nối MQTT, mã lỗi: ");
    Serial.println(mqttState);
    
    // Tăng backoff
    mqttReconnectAttempts++;
    
    // Tăng thời gian chờ theo cấp số nhân (nhân đôi thời gian)
    mqttReconnectInterval = min(mqttReconnectInterval * 2, (unsigned long)MAX_MQTT_RECONNECT_INTERVAL);
    
    // Tính thời gian còn lại trước lần kết nối tiếp theo
    unsigned long remainingTime = mqttReconnectInterval / 1000;
    
    Serial.print("Sẽ thử lại sau: ");
    Serial.print(remainingTime);
    Serial.println(" giây");
    
    // Hiển thị thông báo lỗi kết nối
    lcd.clear();
    lcd.setCursor(2, 0);
    lcd.print("MQTT LOI!");
    lcd.setCursor(0, 1);
    lcd.print("MA: ");
    
    // Hiển thị mã lỗi và thời gian retry
    String errorMsg = String(mqttState) + " - " + String(remainingTime) + "s";
    lcd.print(errorMsg);
    
    delay(2000); // Hiển thị thông báo trong 2 giây
    
    // Cập nhật màn hình chính
    updateMainDisplay();
  }
}

// === Xử lý dữ liệu MQTT nhận được ===
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Tin nhắn nhận được từ MQTT [");
  Serial.print(topic);
  Serial.print("]: ");
  
  // Tạo bản sao nội dung payload thành chuỗi
  char payloadStr[length + 1];
  memcpy(payloadStr, payload, length);
  payloadStr[length] = '\0';
  
  Serial.println(payloadStr);
  
  // Tạo một đối tượng JSON để phân tích payload
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    Serial.print("Lỗi phân tích JSON: ");
    Serial.println(error.c_str());
    return;
  }
  
  // Kiểm tra topic command
  if (String(topic) == mqttTopicCommand) {
    // Kiểm tra lệnh reset LCD
    if (doc.containsKey("action") && doc["action"] == "reset_lcd") {
      Serial.println("Nhận lệnh reset LCD từ MQTT");
      resetLCD();
      createCustomChars();
      updateMainDisplay();
      return;
    }
    
    // Xử lý lệnh điều khiển khác
    if (!error) {
      // Kiểm tra xem đây có phải là phản hồi cho yêu cầu đồng bộ
      if (doc.containsKey("sync_response") && doc["sync_response"].as<bool>() == true) {
        Serial.println("Nhận phản hồi đồng bộ từ backend");
        
        // Cập nhật trạng thái từ backend
        if (doc.containsKey("fan")) {
          bool newFanStatus = doc["fan"].as<bool>();
          if (newFanStatus != fanStatus) {
            fanStatus = newFanStatus;
            // Điều khiển relay
            digitalWrite(FAN_PIN, fanStatus ? LOW : HIGH);
            Serial.println("Đồng bộ FAN: " + String(fanStatus ? "BẬT" : "TẮT"));
          }
        }
        
        if (doc.containsKey("light")) {
          bool newLightStatus = doc["light"].as<bool>();
          if (newLightStatus != lightStatus) {
            lightStatus = newLightStatus;
            // Điều khiển relay
            digitalWrite(LIGHT_PIN, lightStatus ? LOW : HIGH);
            Serial.println("Đồng bộ LIGHT: " + String(lightStatus ? "BẬT" : "TẮT"));
          }
        }
        
        if (doc.containsKey("pump")) {
          bool newPumpStatus = doc["pump"].as<bool>();
          if (newPumpStatus != pumpStatus) {
            pumpStatus = newPumpStatus;
            // Điều khiển relay
            digitalWrite(PUMP_PIN, pumpStatus ? LOW : HIGH);
            Serial.println("Đồng bộ PUMP: " + String(pumpStatus ? "BẬT" : "TẮT"));
          }
        }
        
        if (doc.containsKey("pump2")) {
          bool newPump2Status = doc["pump2"].as<bool>();
          if (newPump2Status != pump2Status) {
            pump2Status = newPump2Status;
            // Điều khiển relay
            digitalWrite(PUMP_2_PIN, pump2Status ? LOW : HIGH);
            Serial.println("Đồng bộ PUMP_2: " + String(pump2Status ? "BẬT" : "TẮT"));
          }
        }
        
        if (doc.containsKey("auto")) {
          autoMode = doc["auto"].as<bool>();
          Serial.println("Đồng bộ AUTO: " + String(autoMode ? "BẬT" : "TẮT"));
        }
        
        // Lưu trạng thái mới
        saveState();
        
        // Đánh dấu đồng bộ đã hoàn thành
        isInitialSyncCompleted = true;
        Serial.println("Đồng bộ trạng thái ban đầu hoàn thành");
        
        // Cập nhật giải thích về AUTO mode
        if (autoMode) {
          Serial.println("Chế độ AUTO được BẬT - Lịch trình từ backend được kích hoạt");
        } else {
          Serial.println("Chế độ AUTO được TẮT - Lịch trình từ backend bị vô hiệu hóa");
        }
        
        // Cập nhật hiển thị
        updateMainDisplay();
        
        // Gửi cập nhật đến backend nếu có thay đổi
        if (prevAutoMode != autoMode) {
          sendDeviceStatusToBackend();
        }
        
        return;
      }
      
      // Xử lý lệnh điều khiển thông thường
      if (doc.containsKey("device") && doc.containsKey("state")) {
        String device = doc["device"].as<String>();
        bool state = doc["state"].as<bool>();
        
        Serial.print("Lệnh điều khiển: ");
        Serial.print(device);
        Serial.print(" -> ");
        Serial.println(state ? "BẬT" : "TẮT");
        
        if (device == "FAN") {
          controlRelay("FAN", state, lastFanChange);
        } else if (device == "LIGHT") {
          controlRelay("LIGHT", state, lastLightChange);
        } else if (device == "PUMP") {
          controlRelay("PUMP", state, lastPumpChange);
        } else if (device == "PUMP_2") {
          controlRelay("PUMP_2", state, lastPump2Change);
        } else if (device == "AUTO") {
          // Lưu trạng thái cũ
          prevAutoMode = autoMode;
          
          // Cập nhật trạng thái mới
          autoMode = state;
          saveState();
          
          // Cập nhật giải thích về AUTO mode
          if (autoMode) {
            Serial.println("Chế độ AUTO được BẬT - Lịch trình từ backend được kích hoạt");
          } else {
            Serial.println("Chế độ AUTO được TẮT - Lịch trình từ backend bị vô hiệu hóa");
          }
          
          // Gửi cập nhật đến backend nếu có thay đổi
          if (prevAutoMode != autoMode) {
            sendDeviceStatusToBackend();
          }
        } else if (device == "ALL") {
          controlRelay("ALL", state, lastFanChange);
          lastLightChange = lastFanChange;
          lastPumpChange = lastFanChange;
          lastPump2Change = lastFanChange;
        }
      }
    }
  }
  // Xử lý lệnh điều khiển camera
  else if (String(topic) == mqttTopicCamera) {
    if (doc.containsKey("action")) {
      String action = doc["action"].as<String>();
      
      if (action == "take_photo") {
        // Gửi lệnh chụp ảnh
        requestCameraCapture();
      }
      else if (action == "stream") {
        // Gửi lệnh điều khiển stream
        bool enable = doc["enable"].as<bool>();
        controlCameraStream(enable);
      }
    }
  }
  // Các topic khác (nếu có)
}

// Gửi trạng thái kết nối
void sendConnectionStatus() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  
  String statusTopic = mqttTopicStatus;
  String statusMsg = "{\"status\":\"connected\",\"timestamp\":" + String(millis()) + "}";
  
  Serial.print("Gửi trạng thái kết nối qua MQTT - Topic: ");
  Serial.println(statusTopic);
  Serial.print("Nội dung: ");
  Serial.println(statusMsg);
  
  mqttClient.publish(statusTopic.c_str(), statusMsg.c_str());
}

// Yêu cầu đồng bộ trạng thái từ backend
void requestInitialSync() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  
  // Sử dụng StaticJsonDocument thay vì DynamicJsonDocument
  StaticJsonDocument<128> doc;
  doc["sync_request"] = true;
  doc["device_serial"] = deviceSerial;
  
  String jsonStr;
  serializeJson(doc, jsonStr);
  
  Serial.print("Gửi yêu cầu đồng bộ trạng thái ban đầu - Topic: ");
  Serial.println(mqttTopicSync);
  Serial.print("Nội dung: ");
  Serial.println(jsonStr);
  
  mqttClient.publish(mqttTopicSync.c_str(), jsonStr.c_str());
}

// Hàm gửi trạng thái thiết bị lên backend
void sendDeviceStatusToBackend() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  
  // Sử dụng StaticJsonDocument thay vì DynamicJsonDocument
  StaticJsonDocument<256> doc;
  doc["device_update"] = true;
  doc["fan"] = fanStatus;
  doc["light"] = lightStatus;
  doc["pump"] = pumpStatus;
  doc["pump2"] = pump2Status;
  doc["auto"] = autoMode;
  doc["timestamp"] = millis();
  
  String jsonStr;
  serializeJson(doc, jsonStr);
  
  Serial.print("Gửi cập nhật trạng thái thiết bị đến backend - Topic: ");
  Serial.println(mqttTopicUpdate);
  Serial.print("Nội dung: ");
  Serial.println(jsonStr);
  
  mqttClient.publish(mqttTopicUpdate.c_str(), jsonStr.c_str());
} 

// === Đọc giá trị cảm biến ===
void readSensors() {
  // Đọc nhiệt độ và độ ẩm từ DHT22
  float newTemp = dht.readTemperature();
  float newHumidity = dht.readHumidity();
  
  // Đọc các giá trị cũ để kiểm tra tính hợp lệ
  float oldTemp = temperature;
  float oldHumidity = humidity;
  float oldLight = lightPercent;
  float oldSoil = soilHumidityPercent;
  
  // Kiểm tra giá trị hợp lệ từ DHT
  if (!isnan(newTemp) && !isnan(newHumidity)) {
    // Áp dụng hệ số hiệu chỉnh
    newTemp = newTemp * TEMPERATURE_CORRECTION_FACTOR;
    newHumidity = newHumidity * HUMIDITY_CORRECTION_FACTOR;
    
    // Lọc nhiễu đơn giản - loại bỏ các thay đổi đột ngột
    if (abs(newTemp - oldTemp) > 10 && oldTemp != 0) {
      // Thay đổi nhiệt độ quá lớn, có thể là nhiễu
      newTemp = oldTemp;
      Serial.println("Lọc nhiễu: thay đổi nhiệt độ quá lớn");
    }
    
    if (abs(newHumidity - oldHumidity) > 20 && oldHumidity != 0) {
      // Thay đổi độ ẩm quá lớn, có thể là nhiễu
      newHumidity = oldHumidity;
      Serial.println("Lọc nhiễu: thay đổi độ ẩm quá lớn");
    }
  } else {
    Serial.println("Lỗi đọc DHT22");
    failedSensorReadCount++;
    // Giữ lại giá trị cũ nếu đọc thất bại
    newTemp = oldTemp;
    newHumidity = oldHumidity;
  }
  
  // Đọc giá trị cảm biến ánh sáng và chuyển đổi sang phần trăm
  int lightVal = analogRead(LIGHT_SENSOR_PIN);
  // Chuyển đổi từ 0-1023 sang 0-100% (đảo ngược vì cảm biến cho giá trị thấp khi nhiều ánh sáng)
  float newLightPercent = (100 - (lightVal / 1023.0 * 100)) * 0.96;
  
  // Lọc nhiễu cho cảm biến ánh sáng
  if (abs(newLightPercent - oldLight) > 30 && oldLight != 0) {
    newLightPercent = oldLight;
    Serial.println("Lọc nhiễu: thay đổi ánh sáng quá lớn");
  }
  
  // Đọc giá trị cảm biến độ ẩm đất và chuyển đổi sang phần trăm
  int soilHumidityVal = analogRead(SOIL_HUMIDITY_SENSOR_PIN);
  // Chuyển đổi từ 0-1023 sang 0-100% (đảo ngược vì cảm biến cho giá trị cao khi khô)
  float newSoilHumidityPercent = (100 - (soilHumidityVal / 1023.0 * 100)) * 0.96;
  
  // Lọc nhiễu cho cảm biến độ ẩm đất
  if (abs(newSoilHumidityPercent - oldSoil) > 30 && oldSoil != 0) {
    newSoilHumidityPercent = oldSoil;
    Serial.println("Lọc nhiễu: thay đổi độ ẩm đất quá lớn");
  }
  
  // Cập nhật bộ đệm để tính trung bình
  tempBuffer[bufferIndex] = newTemp;
  humidityBuffer[bufferIndex] = newHumidity;
  lightBuffer[bufferIndex] = newLightPercent;
  soilBuffer[bufferIndex] = newSoilHumidityPercent;
  
  // Cập nhật chỉ số bộ đệm
  bufferIndex = (bufferIndex + 1) % SENSOR_BUFFER_SIZE;
  if (bufferIndex == 0) {
    bufferFilled = true;
  }
  
  // Tính giá trị trung bình nếu bộ đệm đã được điền đầy đủ
  if (bufferFilled) {
    float tempSum = 0, humiditySum = 0, lightSum = 0, soilSum = 0;
    for (int i = 0; i < SENSOR_BUFFER_SIZE; i++) {
      tempSum += tempBuffer[i];
      humiditySum += humidityBuffer[i];
      lightSum += lightBuffer[i];
      soilSum += soilBuffer[i];
    }
    
    // Cập nhật giá trị với trung bình
    newTemp = tempSum / SENSOR_BUFFER_SIZE;
    newHumidity = humiditySum / SENSOR_BUFFER_SIZE;
    newLightPercent = lightSum / SENSOR_BUFFER_SIZE;
    newSoilHumidityPercent = soilSum / SENSOR_BUFFER_SIZE;
    
    Serial.println("Dữ liệu cảm biến trung bình từ " + String(SENSOR_BUFFER_SIZE) + " mẫu");
  }
  
  // Cập nhật giá trị cuối cùng
  temperature = newTemp;
  humidity = newHumidity;
  lightPercent = newLightPercent;
  soilHumidityPercent = newSoilHumidityPercent;
  
  // Kiểm tra dữ liệu hợp lệ với phạm vi rộng hơn
  bool isInvalid = false;
  String invalidParams = "";
  
  // Kiểm tra từng giá trị và lưu lại tham số không hợp lệ
  if (temperature < -50 || temperature > 100) {
    invalidParams += "T=" + String(temperature) + " ";
    isInvalid = true;
    temperature = oldTemp; // Khôi phục giá trị cũ
  }
  
  if (humidity < 0 || humidity > 100) {
    invalidParams += "H=" + String(humidity) + " ";
    isInvalid = true;
    humidity = oldHumidity; // Khôi phục giá trị cũ
  }
  
  if (lightPercent < 0 || lightPercent > 100) {
    invalidParams += "L=" + String(lightPercent) + " ";
    isInvalid = true;
    lightPercent = oldLight; // Khôi phục giá trị cũ
  }
  
  if (soilHumidityPercent < 0 || soilHumidityPercent > 100) {
    invalidParams += "S=" + String(soilHumidityPercent) + " ";
    isInvalid = true;
    soilHumidityPercent = oldSoil; // Khôi phục giá trị cũ
  }
  
  if (isInvalid) {
    Serial.print("Một số dữ liệu cảm biến không hợp lệ: ");
    Serial.println(invalidParams);
    failedSensorReadCount++;
  } else {
    // Dữ liệu hợp lệ
    Serial.print("Cập nhật cảm biến: T=");
    Serial.print(temperature);
    Serial.print("°C, H=");
    Serial.print(humidity);
    Serial.print("%, L=");
    Serial.print(lightPercent);
    Serial.print("%, S=");
    Serial.print(soilHumidityPercent);
    Serial.println("%");
    
    lastSuccessfulSensorRead = millis();
    failedSensorReadCount = 0; // Reset bộ đếm lỗi
    sensorError = false; // Đặt lại trạng thái lỗi
  }
  
  // Chỉ đánh dấu lỗi cảm biến nếu liên tục thất bại nhiều lần
  if (failedSensorReadCount >= 5) {
    sensorError = true;
    Serial.println("Cảm biến gặp lỗi liên tục sau 5 lần đọc!");
  }
}

// Gửi dữ liệu cảm biến qua MQTT
void sendSensorData() {
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  
  // Sử dụng StaticJsonDocument thay vì DynamicJsonDocument để tránh phân mảnh bộ nhớ
  StaticJsonDocument<256> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["light"] = lightPercent;
  doc["soil"] = soilHumidityPercent;
  doc["fan"] = fanStatus;
  doc["light_status"] = lightStatus;
  doc["pump"] = pumpStatus;
  doc["pump2"] = pump2Status;
  doc["auto"] = autoMode;
  doc["timestamp"] = millis();
  doc["error"] = sensorError;
  
  String jsonStr;
  serializeJson(doc, jsonStr);
  
  Serial.print("Gửi dữ liệu cảm biến qua MQTT - Topic: ");
  Serial.println(mqttTopicData);
  Serial.print("Nội dung: ");
  Serial.println(jsonStr);
  
  mqttClient.publish(mqttTopicData.c_str(), jsonStr.c_str());
}

// Điều khiển relay
void controlRelay(String device, bool turnOn, unsigned long& lastChange) {
  unsigned long currentMillis = millis();
  if (currentMillis - lastChange >= MIN_CHANGE_INTERVAL) {
    // Lưu trạng thái cũ để so sánh sau này
    prevFanStatus = fanStatus;
    prevLightStatus = lightStatus;
    prevPumpStatus = pumpStatus;
    prevPump2Status = pump2Status;
    prevAutoMode = autoMode;
    
    // Điều khiển relay (LOW để BẬT, HIGH để TẮT)
    if (device == "FAN") {
      digitalWrite(FAN_PIN, turnOn ? LOW : HIGH);
      fanStatus = turnOn;
      
      // Hiển thị thông báo trên LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("\x01 Dieu khien Quat");
      lcd.setCursor(0, 1);
      lcd.print(turnOn ? "BAT" : "TAT");
      isShowingNotification = true;
      notificationStartTime = currentMillis;
    }
    else if (device == "LIGHT") {
      digitalWrite(LIGHT_PIN, turnOn ? LOW : HIGH);
      lightStatus = turnOn;
      
      // Hiển thị thông báo trên LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("\x00 Dieu khien Den");
      lcd.setCursor(0, 1);
      lcd.print(turnOn ? "BAT" : "TAT");
      isShowingNotification = true;
      notificationStartTime = currentMillis;
    }
    else if (device == "PUMP") {
      digitalWrite(PUMP_PIN, turnOn ? LOW : HIGH);
      pumpStatus = turnOn;
      
      // Hiển thị thông báo trên LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("\x03 Bom Nuoc");
      lcd.setCursor(0, 1);
      lcd.print(turnOn ? "BAT" : "TAT");
      isShowingNotification = true;
      notificationStartTime = currentMillis;
    }
    else if (device == "PUMP_2") {
      digitalWrite(PUMP_2_PIN, turnOn ? LOW : HIGH);
      pump2Status = turnOn;
      
      // Hiển thị thông báo trên LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("\x03 Dinh Duong");
      lcd.setCursor(0, 1);
      lcd.print(turnOn ? "BAT" : "TAT");
      isShowingNotification = true;
      notificationStartTime = currentMillis;
    }
    else if (device == "ALL") {
      digitalWrite(FAN_PIN, turnOn ? LOW : HIGH);
      digitalWrite(LIGHT_PIN, turnOn ? LOW : HIGH);
      digitalWrite(PUMP_PIN, turnOn ? LOW : HIGH);
      digitalWrite(PUMP_2_PIN, turnOn ? LOW : HIGH);
      fanStatus = turnOn;
      lightStatus = turnOn;
      pumpStatus = turnOn;
      pump2Status = turnOn;
      
      // Hiển thị thông báo trên LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Dieu khien tat ca");
      lcd.setCursor(0, 1);
      lcd.print(turnOn ? "BAT" : "TAT");
      isShowingNotification = true;
      notificationStartTime = currentMillis;
    }
    
    lastChange = currentMillis;
    String deviceName = (device == "FAN") ? "Quạt" : 
                       ((device == "LIGHT") ? "Đèn" : 
                       ((device == "PUMP") ? "Máy bơm 1" : 
                       ((device == "PUMP_2") ? "Máy bơm 2" : "Tất cả")));
    Serial.println(deviceName + ": " + (turnOn ? "Gửi lệnh BẬT" : "Gửi lệnh TẮT"));
    
    // Gửi cập nhật trạng thái đến backend
    sendDeviceStatusToBackend();
    
    lastActivityTime = currentMillis; // Cập nhật thời gian hoạt động
    saveState();
  }
}

// Kiểm tra trạng thái thiết bị
void checkDeviceStatus() {
  // Đọc trạng thái thực tế của các chân relay
  // LOW = ON, HIGH = OFF (relay active LOW)
  bool newFanStatus = digitalRead(FAN_PIN) == LOW;
  bool newLightStatus = digitalRead(LIGHT_PIN) == LOW;
  bool newPumpStatus = digitalRead(PUMP_PIN) == LOW;
  bool newPump2Status = digitalRead(PUMP_2_PIN) == LOW;
  
  // Nếu có sự thay đổi, cập nhật và gửi trạng thái mới
  if (newFanStatus != fanStatus || newLightStatus != lightStatus || 
      newPumpStatus != pumpStatus || newPump2Status != pump2Status) {
    Serial.println("Phát hiện thay đổi trạng thái thiết bị");
    
    // Lưu trạng thái cũ để so sánh sau này
    prevFanStatus = fanStatus;
    prevLightStatus = lightStatus;
    prevPumpStatus = pumpStatus;
    prevPump2Status = pump2Status;
    
    // Cập nhật trạng thái mới
    fanStatus = newFanStatus;
    lightStatus = newLightStatus;
    pumpStatus = newPumpStatus;
    pump2Status = newPump2Status;
    
    // Hiển thị thay đổi trên LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("\x03 Thay doi TT \x03");
    lcd.setCursor(0, 1);
    
    // Hiển thị trạng thái luân phiên (do LCD có giới hạn)
    if (displayMode == 0) {
      lcd.print("F:");
      lcd.print(fanStatus ? "ON" : "OFF");
      lcd.print("L:");
      lcd.print(lightStatus ? "ON" : "OFF");
    } else if (displayMode == 1) {
      lcd.print("Nuoc:");
      lcd.print(pumpStatus ? "ON" : "OFF");
      lcd.print("DD:");
      lcd.print(pump2Status ? "ON" : "OFF");
    }
    
    // Đặt trạng thái hiển thị thông báo
    isShowingNotification = true;
    notificationStartTime = millis();
    
    // Gửi cập nhật đến backend
    sendDeviceStatusToBackend();
    
    // Lưu trạng thái
    saveState();
  }
}

// Lưu trạng thái
void saveState() {
  // Trong Arduino Uno R4 WiFi, bạn sẽ lưu vào Flash
  Serial.println("Lưu trạng thái thiết bị");
  // Code lưu vào Flash sẽ được thêm sau
}

// Tải trạng thái
void loadState() {
  // Trong Arduino Uno R4 WiFi, bạn sẽ đọc từ Flash
  Serial.println("Tải trạng thái thiết bị");
  // Code đọc từ Flash sẽ được thêm sau
  
  // Giả sử các trạng thái mặc định
  autoMode = false;
  fanStatus = false;
  lightStatus = false;
  pumpStatus = false;
  pump2Status = false;
  schedulingMode = false;
}

// Lấy mã serial của thiết bị
void getDeviceSerial() {
  // Sử dụng mã serial mặc định hoặc tạo từ địa chỉ MAC
  // strcpy(deviceSerial, "GARDEN123456"); // Đã được định nghĩa trong biến toàn cục
  
  // Tạo chủ đề MQTT bao gồm camera
  mqttTopicData = "garden/" + String(deviceSerial) + "/data";
  mqttTopicCommand = "garden/" + String(deviceSerial) + "/command";
  mqttTopicStatus = "garden/" + String(deviceSerial) + "/status";
  mqttTopicCamera = "garden/" + String(deviceSerial) + "/camera";
  mqttTopicSync = "garden/" + String(deviceSerial) + "/sync";
  mqttTopicUpdate = "garden/" + String(deviceSerial) + "/update";
  mqttTopicLogs = "garden/" + String(deviceSerial) + "/logs";
  
  Serial.print("Mã serial thiết bị: ");
  Serial.println(deviceSerial);
}

// Chức năng auto control (chuyển cho backend xử lý)
void autoControl() {
  if (autoMode) {
    // Chỉ log thông tin khi autoMode được bật
    static unsigned long lastLogTime = 0;
    unsigned long currentMillis = millis();
    
    // Log mỗi 5 phút để tránh log quá nhiều
    if (currentMillis - lastLogTime > 300000) {
      Serial.println("Chế độ AUTO đang được bật - Chờ lệnh từ backend");
      lastLogTime = currentMillis;
    }
  }
}

// === Chức năng cấu hình WiFi ===

// Khởi động chế độ cấu hình
void startConfigMode() {
  configMode = true;
  configModeStartTime = millis();
  
  Serial.println("Bắt đầu chế độ cấu hình WiFi");
  
  // Đảm bảo tắt mọi kết nối WiFi hiện tại
  WiFi.disconnect();  // Sửa lại không sử dụng tham số
  delay(1000);
  
  // Hiển thị thông báo trên LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CAU HINH WIFI");
  lcd.setCursor(0, 1);
  lcd.print(AP_SSID);
  
  // Tạm thời tắt watchdog trong thời gian cấu hình
  setWatchdogState(false);
  
  // Đổi kênh WiFi thành kênh ít nhiễu (thử kênh 1, 6 hoặc 11)
  // Thử sử dụng AP với các tham số khác nhau
  int status = WiFi.beginAP(AP_SSID, AP_PASSWORD);
  
  if (status != WL_AP_LISTENING) {
    Serial.println("Không thể tạo Access Point, mã lỗi: " + String(status));
    // Thử cách khác nếu không thành công
    status = WiFi.beginAP(AP_SSID);
    if (status != WL_AP_LISTENING) {
      Serial.println("Vẫn không thể tạo AP, khởi động lại...");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Loi AP: " + String(status));
      lcd.setCursor(0, 1);
      lcd.print("Khoi dong lai...");
      delay(3000);
      resetDevice();
      return;
    }
  }
  
  // In thông tin AP
  Serial.println("-----------------------");
  Serial.println("Access Point đã sẵn sàng!");
  Serial.print("Tên SSID: ");
  Serial.println(AP_SSID);
  Serial.print("Mật khẩu: ");
  Serial.println(AP_PASSWORD);
  Serial.print("Địa chỉ IP: ");
  Serial.println(WiFi.localIP());
  Serial.println("-----------------------");
  
  // Khởi động web server
  webServer.begin();
  
  // Làm mới LCD thông báo AP hoạt động
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("AP: " + String(AP_SSID));
  lcd.setCursor(0, 1);
  lcd.print("IP: " + WiFi.localIP().toString());
  
  Serial.println("Web server đã được khởi động");
  Serial.println("Kết nối đến WiFi: " + String(AP_SSID) + " với mật khẩu: " + String(AP_PASSWORD));
  Serial.println("Sau đó mở trình duyệt và truy cập địa chỉ: " + WiFi.localIP().toString());
}

// Xử lý client kết nối đến web server
void handleClient() {
  WiFiClient client = webServer.available();
  if (client) {
    Serial.println("Client mới kết nối");
    
    String currentLine = "";
    String postData = "";
    boolean postFlag = false;
    
    // Thời gian timeout nhanh hơn
    unsigned long connectionTime = millis();
    
    // Tạm thời tắt watchdog trong khi xử lý client
    bool previousWatchdogState = watchdogEnabled;
    setWatchdogState(false);
    
    // Không cần timeout dài cho phản hồi
    while (client.connected() && millis() - connectionTime < 2000) {
      if (client.available()) {
        char c = client.read();
        
        if (c == '\n') {
          if (currentLine.length() == 0) {
            if (postFlag) break;
            
            // Gửi phản hồi HTTP header
            client.println("HTTP/1.1 200 OK");
            client.println("Content-Type: text/html");
            client.println("Connection: close");
            client.println();
            
            // Gửi nội dung trang
            client.println(buildConfigPage());
            break;
          } else {
            if (currentLine.startsWith("POST")) {
              postFlag = true;
            }
            currentLine = "";
          }
        } else if (c != '\r') {
          currentLine += c;
        }
        
        connectionTime = millis();
      }
    }
    
    // Nếu là POST request, xử lý dữ liệu
    if (postFlag) {
      unsigned long postTime = millis();
      
      // Đọc dữ liệu POST
      while (client.connected() && millis() - postTime < 1000) {
        if (client.available()) {
          char c = client.read();
          postData += c;
        }
      }
      
      // Xử lý dữ liệu POST
      if (postData.indexOf("ssid=") != -1) {
        String newSsid = "";
        String newPassword = "";
        
        // Lấy SSID
        int ssidStart = postData.indexOf("ssid=") + 5;
        int ssidEnd = postData.indexOf("&", ssidStart);
        if (ssidEnd != -1) {
          newSsid = postData.substring(ssidStart, ssidEnd);
        } else {
          newSsid = postData.substring(ssidStart);
        }
        
        // Lấy Password
        if (postData.indexOf("password=") != -1) {
          int passStart = postData.indexOf("password=") + 9;
          int passEnd = postData.indexOf("&", passStart);
          if (passEnd != -1) {
            newPassword = postData.substring(passStart, passEnd);
          } else {
            newPassword = postData.substring(passStart);
          }
        }
        
        // Giải mã URL encoding
        newSsid.replace("+", " ");
        newSsid.replace("%2F", "/");
        newSsid.replace("%3A", ":");
        newSsid.replace("%40", "@");
        
        // Cập nhật cấu hình WiFi
        strncpy(ssid, newSsid.c_str(), sizeof(ssid) - 1);
        strncpy(password, newPassword.c_str(), sizeof(password) - 1);
        
        Serial.println("Đã nhận cấu hình WiFi mới:");
        Serial.print("SSID: ");
        Serial.println(ssid);
        
        shouldSaveWifiConfig = true;
        
        // Thông báo thành công
        client.println("HTTP/1.1 200 OK");
        client.println("Content-Type: text/html");
        client.println("Connection: close");
        client.println();
        client.println("<html><body><h1>WiFi đã được cấu hình</h1><p>Thiết bị sẽ khởi động lại sau 3 giây...</p></body></html>");
      }
    }
    
    // Đóng kết nối
    client.stop();
    
    // Nếu cần lưu cấu hình WiFi
    if (shouldSaveWifiConfig) {
      saveWifiConfig();
      
      // Hiển thị thông báo lưu cấu hình trên LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("DA LUU CAU HINH");
      lcd.setCursor(0, 1);
      lcd.print("Khoi dong lai...");
      
      delay(3000);
      resetDevice();  // Khởi động lại thiết bị
    }
    
    // Khôi phục trạng thái watchdog
    if (previousWatchdogState) {
      setWatchdogState(true);
    }
  }
}

// Tạo trang cấu hình
String buildConfigPage() {
  // Tạo token ngẫu nhiên cho phiên hiện tại
  lastAccessToken = random(100000, 999999);
  accessTokenValid = true;
  
  String page = "<!DOCTYPE html><html><head>";
  page += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  page += "<title>WiFi Setup</title>";
  page += "<style>body{font-family:Arial;margin:20px;text-align:center}";
  page += "input{width:90%;padding:10px;margin:10px 0;display:block;margin:10px auto}";
  page += "button{background:#4CAF50;color:#fff;padding:10px 20px;border:0;margin-top:10px;width:90%}</style>";
  page += "</head><body><h1>WiFi Setup</h1>";
  page += "<form method='post'>";
  page += "<input type='text' name='ssid' placeholder='WiFi name:' value='" + String(ssid) + "'>";
  page += "<input type='password' name='password' placeholder='WiFi Password:'>";
  page += "<input type='hidden' name='override' value='true'>";
  page += "<button type='submit'>Save & Restart</button>";
  page += "<p class=\"note\">MQTT Connection: " + String(mqtt_server) + ":" + String(mqtt_port) + "</p>\n";
  page += "<p class=\"note\">Device ID: " + String(deviceSerial) + "</p>\n";
  page += "</form></body></html>";
  return page;
}

// Tải cấu hình WiFi từ EEPROM
void loadWifiConfig() {
  uint8_t wifiSavedFlag = EEPROM.read(EEPROM_WIFI_SAVED_FLAG);
  
  if (wifiSavedFlag == 1) {
    // Đã có cấu hình WiFi, đọc từ EEPROM
    for (int i = 0; i < 32; i++) {
      ssid[i] = EEPROM.read(EEPROM_SSID_ADDR + i);
    }
    
    for (int i = 0; i < 32; i++) {
      password[i] = EEPROM.read(EEPROM_PASS_ADDR + i);
    }
    
    for (int i = 0; i < 40; i++) {
      mqtt_server[i] = EEPROM.read(EEPROM_MQTT_SERVER_ADDR + i);
    }
    
    int portValue = 0;
    EEPROM.get(EEPROM_MQTT_PORT_ADDR, portValue);
    if (portValue > 0 && portValue < 65536) {
      mqtt_port = portValue;
    }
    
    Serial.println("Đã tải cấu hình WiFi từ EEPROM");
    Serial.print("SSID: ");
    Serial.println(ssid);
    Serial.print("MQTT Server: ");
    Serial.println(mqtt_server);
    Serial.print("MQTT Port: ");
    Serial.println(mqtt_port);
  } else {
    Serial.println("Không tìm thấy cấu hình WiFi trong EEPROM");
  }
}

// Lưu cấu hình WiFi vào EEPROM
void saveWifiConfig() {
  // Lưu cờ đánh dấu đã lưu cấu hình
  EEPROM.write(EEPROM_WIFI_SAVED_FLAG, 1);
  
  // Lưu SSID
  for (int i = 0; i < 32; i++) {
    EEPROM.write(EEPROM_SSID_ADDR + i, ssid[i]);
  }
  
  // Lưu mật khẩu
  for (int i = 0; i < 32; i++) {
    EEPROM.write(EEPROM_PASS_ADDR + i, password[i]);
  }
  
  // Lưu MQTT server
  for (int i = 0; i < 40; i++) {
    EEPROM.write(EEPROM_MQTT_SERVER_ADDR + i, mqtt_server[i]);
  }
  
  // Lưu MQTT port
  EEPROM.put(EEPROM_MQTT_PORT_ADDR, mqtt_port);
  
  Serial.println("Đã lưu cấu hình WiFi vào EEPROM");
}

// Khởi động lại thiết bị
void resetDevice() {
  Serial.println("Đang khởi động lại thiết bị...");
  
  // Vô hiệu hóa watchdog trước khi reset
  if (ENABLE_WATCHDOG) {
    setWatchdogState(false);
  }
  
  // Đợi và khởi động lại
  delay(1000);
  NVIC_SystemReset();
}

// === Hàm khởi tạo UART cho ESP32-CAM ===
void initESP32CamUART() {
  // Khởi tạo Serial1 để giao tiếp với ESP32-CAM 
  Serial1.begin(ESP32CAM_UART_BAUD);
  
  // Thiết lập các chân RX/TX (nếu cần) cho Arduino Uno R4 WiFi
  // Lưu ý: Arduino Uno R4 WiFi sử dụng UART hardware nên không cần thiết lập 
  // các chân như trên một số board Arduino khác
  
  Serial.println("Khởi tạo kết nối UART với ESP32-CAM");
  
  // Hiển thị thông báo trên LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Dang ket noi");
  lcd.setCursor(0, 1);
  lcd.print("ESP32-CAM...");
  
  // Gửi lệnh kiểm tra kết nối
  sendESP32CamCommand("{\"action\":\"check_connection\"}");
}

// === Hàm gửi lệnh cho ESP32-CAM qua UART ===
void sendESP32CamCommand(String command) {
  Serial.println("Gửi lệnh đến ESP32-CAM: " + command);
  Serial1.println(command);
  lastCameraCommand = millis();
  
  // Thêm dòng debug để kiểm tra
  Serial.println("UART TX -> ESP32-CAM: " + command);
  
  // Hiển thị thông tin trạng thái chờ trên LCD với bố cục tốt hơn
  lcd.clear();
  lcd.setCursor(3, 0);
  lcd.print("CAMERA CMD");
  lcd.setCursor(1, 1);
  lcd.print("DANG XU LY...");
  isShowingNotification = true;
  notificationStartTime = millis();
}

// === Hàm gửi thông tin WiFi cho ESP32-CAM ===
void sendWiFiCredentialsToCamera() {
  if (!esp32CamConnected) {
    Serial.println("Không thể gửi WiFi: ESP32-CAM chưa kết nối");
    // Thử gửi thông tin WiFi ngay cả khi chưa kết nối
    esp32CamConnected = true; // Giả định tạm thời kết nối để gửi thông tin
  }
  
  // Sử dụng StaticJsonDocument thay vì DynamicJsonDocument
  StaticJsonDocument<320> doc;
  JsonObject wifi_config = doc.createNestedObject("wifi_config");
  wifi_config["ssid"] = ssid;
  wifi_config["password"] = password;
  
  // Thêm thông tin MQTT server và port
  JsonObject mqtt_config = doc.createNestedObject("mqtt_config");
  mqtt_config["server"] = mqtt_server;
  mqtt_config["port"] = mqtt_port;
  
  String jsonCommand;
  serializeJson(doc, jsonCommand);
  
  // Gửi thông tin WiFi qua UART
  sendESP32CamCommand(jsonCommand);
  
  Serial.println("Đã gửi thông tin WiFi và MQTT đến ESP32-CAM");
  logEvent("Đã gửi thông tin WiFi và MQTT đến ESP32-CAM");
}

// === Hàm điều khiển streaming từ ESP32-CAM ===
void controlCameraStream(bool enable) {
  if (!esp32CamConnected) {
    Serial.println("Không thể điều khiển stream: ESP32-CAM chưa kết nối");
    
    // Hiển thị thông báo trên LCD với bố cục tốt hơn
    lcd.clear();
    lcd.setCursor(4, 0);
    lcd.print("LOI CAM");
    lcd.setCursor(1, 1);
    lcd.print("CHUA KET NOI!");
    isShowingNotification = true;
    notificationStartTime = millis();
    
    return;
  }
  
  // Kiểm tra xem có đang chờ phản hồi từ camera hay không
  if (lastCameraCommand > 0 && millis() - lastCameraCommand < CAMERA_RESPONSE_TIMEOUT) {
    Serial.println("Đang chờ phản hồi từ camera, hãy thử lại sau");
    
    // Hiển thị thông báo trên LCD với bố cục tốt hơn
    lcd.clear();
    lcd.setCursor(3, 0);
    lcd.print("CAMERA BAN!");
    lcd.setCursor(1, 1);
    lcd.print("THU LAI SAU...");
    isShowingNotification = true;
    notificationStartTime = millis();
    
    return;
  }
  
  // Sử dụng StaticJsonDocument thay vì DynamicJsonDocument
  StaticJsonDocument<128> doc;
  doc["action"] = "stream";
  doc["enable"] = enable;
  
  String jsonCommand;
  serializeJson(doc, jsonCommand);
  
  // Gửi lệnh qua UART
  sendESP32CamCommand(jsonCommand);
  
  // Cập nhật trạng thái streaming (tạm thời - sẽ được xác nhận khi nhận phản hồi)
  // Tránh cập nhật trạng thái ngay, đợi phản hồi từ camera
  
  // Hiển thị thông báo đang chờ trên LCD với bố cục tốt hơn
  lcd.clear();
  lcd.setCursor(2, 0);
  lcd.print("CAMERA STREAM");
  lcd.setCursor(3, 1);
  lcd.print(enable ? "DANG BAT..." : "DANG TAT...");
  isShowingNotification = true;
  notificationStartTime = millis();
  
  logEvent("Đã gửi lệnh " + String(enable ? "BẬT" : "TẮT") + " streaming tới ESP32-CAM");
}

// === Hàm yêu cầu ESP32-CAM chụp ảnh ===
void requestCameraCapture() {
  if (!esp32CamConnected) {
    Serial.println("Không thể chụp ảnh: ESP32-CAM chưa kết nối");
    
    // Hiển thị thông báo trên LCD với bố cục tốt hơn
    lcd.clear();
    lcd.setCursor(4, 0);
    lcd.print("LOI CAMERA");
    lcd.setCursor(1, 1);
    lcd.print("CHUA KET NOI!");
    isShowingNotification = true;
    notificationStartTime = millis();
    
    return;
  }
  
  // Kiểm tra xem có đang chờ phản hồi từ camera hay không
  if (lastCameraCommand > 0 && millis() - lastCameraCommand < CAMERA_RESPONSE_TIMEOUT) {
    Serial.println("Đang chờ phản hồi từ camera, hãy thử lại sau");
    
    // Hiển thị thông báo trên LCD với bố cục tốt hơn
    lcd.clear();
    lcd.setCursor(3, 0);
    lcd.print("CAMERA BAN!");
    lcd.setCursor(1, 1);
    lcd.print("THU LAI SAU...");
    isShowingNotification = true;
    notificationStartTime = millis();
    
    return;
  }
  
  // Hiển thị thông báo trên LCD với bố cục tốt hơn
  lcd.clear();
  lcd.setCursor(2, 0);
  lcd.print("CHUP ANH");
  lcd.setCursor(4, 1);
  lcd.print("DANG XU LY");
  isShowingNotification = true;
  notificationStartTime = millis();
  
  // Gửi lệnh chụp ảnh
  sendESP32CamCommand("{\"action\":\"take_photo\"}");
  
  logEvent("Đã gửi lệnh chụp ảnh tới ESP32-CAM");
}

// === Hàm xử lý dữ liệu nhận được từ ESP32-CAM ===
void processESP32CamData(String data) {
  Serial.println("Nhận từ ESP32-CAM: " + data);
  
  // Thêm dòng debug để kiểm tra
  Serial.println("UART RX <- ESP32-CAM: " + data);
  
  // Sử dụng StaticJsonDocument thay vì DynamicJsonDocument
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, data);
  
  if (error) {
    Serial.print("Lỗi phân tích JSON: ");
    Serial.println(error.c_str());
    return;
  }
  
  // Xử lý thông tin trạng thái
  if (doc.containsKey("status")) {
    String status = doc["status"].as<String>();
    
    // Xử lý trạng thái sẵn sàng
    if (status == "ready") {
      esp32CamConnected = true;
      
      // Hiển thị thông báo trên LCD - cải thiện bố cục
      lcd.clear();
      lcd.setCursor(3, 0);
      lcd.print("CAMERA OK");
      lcd.setCursor(2, 1);
      lcd.print("DA KET NOI!");
      isShowingNotification = true;
      notificationStartTime = millis();
      
      // Gửi thông tin WiFi sau khi kết nối
      sendWiFiCredentialsToCamera();
      
      logEvent("ESP32-CAM đã kết nối");
    }
    // Xử lý kết quả chụp ảnh
    else if (status == "photo_saved") {
      if (doc.containsKey("file")) {
        String fileName = doc["file"].as<String>();
        
        // Hiển thị thông báo trên LCD - cải thiện bố cục
        lcd.clear();
        lcd.setCursor(4, 0);
        lcd.print("ANH OK");
        lcd.setCursor(2, 1);
        // Hiển thị tên file ngắn gọn
        String shortName = fileName.substring(fileName.lastIndexOf('/') + 1);
        if (shortName.length() > 14) {
          shortName = shortName.substring(0, 14);
        }
        lcd.print(shortName);
        isShowingNotification = true;
        notificationStartTime = millis();
        
        logEvent("ESP32-CAM đã chụp ảnh: " + fileName);
      }
    }
    // Xử lý trạng thái streaming
    else if (status.startsWith("streaming_")) {
      bool isEnabled = status.endsWith("enabled");
      esp32CamStreaming = isEnabled;
      
      // Hiển thị thông báo trên LCD - cải thiện bố cục
      lcd.clear();
      lcd.setCursor(1, 0);
      lcd.print("CAMERA STREAM");
      lcd.setCursor(isEnabled ? 4 : 5, 1);
      lcd.print(isEnabled ? "DA BAT!" : "DA TAT!");
      isShowingNotification = true;
      notificationStartTime = millis();
      
      logEvent("ESP32-CAM streaming đã " + String(isEnabled ? "BẬT" : "TẮT"));
    }
    // Xử lý thông báo lỗi
    else if (status == "error") {
      String errorMsg = doc.containsKey("message") ? doc["message"].as<String>() : "Lỗi không xác định";
      
      // Hiển thị thông báo lỗi trên LCD - cải thiện bố cục
      lcd.clear();
      lcd.setCursor(4, 0);
      lcd.print("LOI CAMERA");
      lcd.setCursor(0, 1);
      // Giới hạn độ dài thông báo lỗi
      if (errorMsg.length() > 16) {
        errorMsg = errorMsg.substring(0, 16);
      }
      // Căn giữa tin nhắn lỗi
      int startPos = max(0, (16 - errorMsg.length()) / 2);
      lcd.setCursor(startPos, 1);
      lcd.print(errorMsg);
      isShowingNotification = true;
      notificationStartTime = millis();
      
      logEvent("Lỗi ESP32-CAM: " + errorMsg, "ERROR");
    }
    // Xử lý thông báo kết nối WiFi
    else if (status == "wifi_connected") {
      String ip = doc.containsKey("ip") ? doc["ip"].as<String>() : "Unknown";
      
      // Hiển thị thông báo trên LCD - cải thiện bố cục
      lcd.clear();
      lcd.setCursor(2, 0);
      lcd.print("CAMERA WIFI OK");
      lcd.setCursor(0, 1);
      // Hiển thị IP ngắn gọn
      if (ip.length() > 16) {
        ip = ip.substring(0, 16);
      }
      // Căn giữa địa chỉ IP
      int startPos = max(0, (16 - ip.length()) / 2);
      lcd.setCursor(startPos, 1);
      lcd.print(ip);
      isShowingNotification = true;
      notificationStartTime = millis();
      
      logEvent("ESP32-CAM đã kết nối WiFi, IP: " + ip);
    }
    // Xử lý thông báo lỗi WiFi
    else if (status == "wifi_error") {
      String errorCode = doc.containsKey("error") ? doc["error"].as<String>() : "Unknown";
      
      // Hiển thị thông báo trên LCD - cải thiện bố cục
      lcd.clear();
      lcd.setCursor(2, 0);
      lcd.print("CAMERA LOI WIFI");
      lcd.setCursor(4, 1);
      lcd.print("MA: " + errorCode);
      isShowingNotification = true;
      notificationStartTime = millis();
      
      logEvent("ESP32-CAM lỗi WiFi, mã: " + errorCode, "ERROR");
    }
    // Xử lý thông báo kết nối MQTT
    else if (status == "mqtt_connected") {
      String broker = doc.containsKey("broker") ? doc["broker"].as<String>() : mqtt_server;
      
      // Hiển thị thông báo trên LCD - cải thiện bố cục
      lcd.clear();
      lcd.setCursor(2, 0);
      lcd.print("CAMERA MQTT OK");
      lcd.setCursor(0, 1);
      // Hiển thị broker ngắn gọn
      if (broker.length() > 16) {
        broker = broker.substring(0, 16);
      }
      // Căn giữa địa chỉ broker
      int startPos = max(0, (16 - broker.length()) / 2);
      lcd.setCursor(startPos, 1);
      lcd.print(broker);
      isShowingNotification = true;
      notificationStartTime = millis();
      
      logEvent("ESP32-CAM đã kết nối MQTT tới " + broker);
    }
    // Xử lý thông báo lỗi MQTT
    else if (status == "mqtt_error" || status == "mqtt_failed") {
      String errorInfo = doc.containsKey("error") ? doc["error"].as<String>() : 
                        (doc.containsKey("attempts") ? "Sau " + doc["attempts"].as<String>() + " lan" : "Unknown");
      
      // Hiển thị thông báo trên LCD - cải thiện bố cục
      lcd.clear();
      lcd.setCursor(2, 0);
      lcd.print("CAMERA LOI MQTT");
      lcd.setCursor(0, 1);
      // Hiển thị lỗi ngắn gọn
      if (errorInfo.length() > 16) {
        errorInfo = errorInfo.substring(0, 16);
      }
      // Căn giữa thông báo lỗi
      int startPos = max(0, (16 - errorInfo.length()) / 2);
      lcd.setCursor(startPos, 1);
      lcd.print(errorInfo);
      isShowingNotification = true;
      notificationStartTime = millis();
      
      logEvent("ESP32-CAM lỗi MQTT: " + errorInfo, "ERROR");
    }
  }
}

// Kiểm tra ESP32-CAM timeout
void checkCameraTimeout() {
  unsigned long currentMillis = millis();
  
  // Kiểm tra timeout cho lệnh gửi tới camera
  if (lastCameraCommand > 0 && currentMillis - lastCameraCommand > CAMERA_RESPONSE_TIMEOUT) {
    // Nếu đã gửi lệnh và quá thời gian timeout mà không có phản hồi
    Serial.println("CẢNH BÁO: ESP32-CAM không phản hồi trong " + String(CAMERA_RESPONSE_TIMEOUT/1000) + " giây");
    
    if (isShowingNotification) {
      // Nếu đang hiển thị thông báo về camera, cập nhật thông báo timeout
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Camera timeout");
      lcd.setCursor(0, 1);
      lcd.print("Kiem tra lai");
      
      // Reset thời gian hiển thị thông báo
      notificationStartTime = currentMillis;
    }
    
    // Ghi log sự kiện timeout
    logEvent("ESP32-CAM không phản hồi, đã quá thời gian chờ", "WARNING");
    
    // Đặt lại biến trạng thái camera nếu nhiều lần timeout liên tiếp
    static int timeoutCount = 0;
    timeoutCount++;
    
    if (timeoutCount >= 3) {
      // Sau 3 lần timeout liên tiếp, đánh dấu camera là mất kết nối
      esp32CamConnected = false;
      esp32CamStreaming = false;
      timeoutCount = 0;
      logEvent("Đã đánh dấu ESP32-CAM là mất kết nối sau nhiều lần timeout", "ERROR");
    }
    
    // Đặt lại thời gian lệnh camera để tránh kích hoạt timeout liên tục
    lastCameraCommand = 0;
  }
  
  // Thử kết nối lại camera nếu đã mất kết nối
  if (!esp32CamConnected && currentMillis - lastCameraCheck > ESP32CAM_CHECK_INTERVAL) {
    // Gửi lệnh kiểm tra kết nối
    Serial.println("Thử kết nối lại với ESP32-CAM...");
    sendESP32CamCommand("{\"action\":\"check_connection\"}");
    lastCameraCheck = currentMillis;
  }
}

// Hàm ghi log trạng thái backoff
void logBackoffStatus() {
  String connectionInfo = "=== THÔNG TIN KẾT NỐI ===\n";
  
  // Thông tin kết nối WiFi
  connectionInfo += "WiFi: ";
  if (WiFi.status() == WL_CONNECTED) {
    connectionInfo += "Đã kết nối đến " + String(WiFi.SSID()) + "\n";
    connectionInfo += "Địa chỉ IP: " + WiFi.localIP().toString() + "\n";
  } else {
    connectionInfo += "Chưa kết nối\n";
    connectionInfo += "Số lần thử: " + String(wifiReconnectAttempts) + "\n";
    connectionInfo += "Thời gian chờ: " + String(wifiReconnectInterval / 1000) + " giây\n";
  }
  
  // Thông tin kết nối MQTT
  connectionInfo += "MQTT: ";
  if (mqttClient.connected()) {
    connectionInfo += "Đã kết nối đến " + String(mqtt_server) + ":" + String(mqtt_port) + "\n";
    connectionInfo += "Client ID: GardenUnoR4-" + String(deviceSerial) + "\n";
  } else {
    connectionInfo += "Chưa kết nối\n";
    connectionInfo += "Số lần thử: " + String(mqttReconnectAttempts) + "\n";
    connectionInfo += "Thời gian chờ: " + String(mqttReconnectInterval / 1000) + " giây\n";
    connectionInfo += "Mã lỗi MQTT: " + String(mqttClient.state()) + "\n";
  }
  
  connectionInfo += "======================";
  Serial.println(connectionInfo);
  
  // Ghi log sự kiện kết nối
  if (mqttClient.connected()) {
    // Chỉ gửi log khi đã kết nối MQTT
    logEvent("Trạng thái kết nối - WiFi: " + 
             String(WiFi.status() == WL_CONNECTED ? "OK" : "LỖI") + 
             ", MQTT: " + 
             String(mqttClient.connected() ? "OK" : "LỖI"));
  }
}