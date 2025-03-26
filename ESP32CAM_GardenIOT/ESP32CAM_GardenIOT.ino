// ESP32-CAM cho hệ thống Garden IOT
// Liên kết với Arduino Uno R4 WiFi qua giao tiếp UART

#include "esp_camera.h"
#include "Arduino.h"
#include "FS.h"
#include "SD_MMC.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "driver/rtc_io.h"
#include <EEPROM.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <PubSubClient.h>

// Cấu hình EEPROM
#define EEPROM_SIZE 512
#define WIFI_SSID_ADDR 0      // Địa chỉ lưu SSID (32 bytes)
#define WIFI_PASS_ADDR 32     // Địa chỉ lưu password (32 bytes)
#define WIFI_SAVED_FLAG 64    // Địa chỉ lưu cờ đã lưu WiFi (1 byte)
#define DEVICE_SERIAL_ADDR 65 // Địa chỉ lưu device serial (32 bytes)
#define MQTT_SERVER_ADDR 97  // Địa chỉ lưu MQTT server (40 bytes)
#define MQTT_PORT_ADDR 137   // Địa chỉ lưu MQTT port (4 bytes)

// Cấu hình camera cho ESP32-CAM AI-THINKER
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// LED Flash
#define LED_BUILTIN       4
#define FLASH_LED_PIN     4

// Cấu hình UART
#define RX_PIN            3  // RX của ESP32-CAM kết nối với TX của Arduino
#define TX_PIN            1  // TX của ESP32-CAM kết nối với RX của Arduino
#define UART_BAUD_RATE    115200

// Thông tin WiFi và MQTT
char ssid[32] = "Duong";
char password[32] = "88888888";
char deviceSerial[32] = "CAM8228";
char mqtt_server[40] = "172.20.10.3";  // Mặc định MQTT server
int mqtt_port = 1883;                  // Mặc định MQTT port
char mqtt_user[20] = "";               // MQTT username
char mqtt_pass[20] = "";  
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Chủ đề MQTT
String mqttTopicImage;       // garden/{deviceSerial}/image
String mqttTopicStream;      // garden/{deviceSerial}/stream
String mqttTopicCommand;     // garden/{deviceSerial}/command
String mqttTopicStatus;      // garden/{deviceSerial}/status

// Các biến cho camera
bool takingPhoto = false;
bool streamingEnabled = false;
unsigned long lastPhotoTime = 0;
unsigned long lastStreamTime = 0;
unsigned long lastStatusTime = 0;
const unsigned long PHOTO_INTERVAL = 10000;     // 10 giây/ảnh khi chụp định kỳ
const unsigned long STREAM_INTERVAL = 200;      // 200ms/frame khi streaming
const unsigned long STATUS_INTERVAL = 5000;     // 5 giây gửi trạng thái

// Cờ đồng bộ
bool isWifiConfigured = false;
bool isMqttConnected = false;
bool cameraInitialized = false;
bool directModeEnabled = false;   // Chế độ kết nối trực tiếp không qua Arduino
unsigned long lastArduinoContact = 0; // Thời điểm cuối cùng nhận được dữ liệu từ Arduino
const unsigned long ARDUINO_TIMEOUT = 60000; // 60 giây không nhận được dữ liệu từ Arduino -> chuyển sang chế độ trực tiếp

// Buffer cho UART
String uartBuffer = "";
const unsigned long UART_TIMEOUT = 1000;  // 1 giây timeout
unsigned long lastUartActivity = 0;

// Thêm biến đếm lỗi
int errorCount = 0;
const int MAX_ERRORS = 5;

// Thêm các hằng số cho retry
#define MAX_RETRIES 3
#define RETRY_DELAY 1000
#define MAX_SD_RETRIES 3
#define SD_RETRY_DELAY 2000

// Thêm khóa mã hóa cho EEPROM
const uint8_t EEPROM_KEY[16] = {0x12, 0x34, 0x56, 0x78, 0x90, 0xAB, 0xCD, 0xEF, 
                               0x12, 0x34, 0x56, 0x78, 0x90, 0xAB, 0xCD, 0xEF};

// Cấu hình quản lý thẻ SD
#define MAX_PHOTOS 100            // Số lượng ảnh tối đa lưu trữ
#define MIN_SD_SPACE 10 * 1024 * 1024  // Dung lượng trống tối thiểu (10MB)

// Hàm mã hóa dữ liệu
void encryptData(uint8_t* data, size_t len) {
  for(size_t i = 0; i < len; i++) {
    data[i] ^= EEPROM_KEY[i % 16];
  }
}

// Hàm giải mã dữ liệu
void decryptData(uint8_t* data, size_t len) {
  for(size_t i = 0; i < len; i++) {
    data[i] ^= EEPROM_KEY[i % 16];
  }
}

// Thêm hàm xử lý lỗi
void handleError(String errorMessage) {
  errorCount++;
  Serial.println("Lỗi: " + errorMessage);
  
  // Gửi thông báo lỗi về Arduino
  String errorMsg = "{\"status\":\"error\",\"message\":\"" + errorMessage + "\"}";
  Serial2.println(errorMsg);
  
  // Nếu quá nhiều lỗi, khởi động lại
  if (errorCount >= MAX_ERRORS) {
    Serial.println("Quá nhiều lỗi, khởi động lại ESP32-CAM...");
    delay(1000);
    ESP.restart();
  }
}

// Kiểm tra và quản lý không gian lưu trữ SD
bool checkSDCardSpace() {
  if (!SD_MMC.begin()) {
    Serial.println("Lỗi kết nối thẻ SD");
    return false;
  }

  // Kiểm tra dung lượng còn trống
  uint64_t cardSize = SD_MMC.cardSize();
  uint64_t usedBytes = 0;
  
  File root = SD_MMC.open("/");
  if (!root) {
    Serial.println("Không thể mở thư mục gốc");
    return false;
  }
  
  if (!root.isDirectory()) {
    Serial.println("Không phải là thư mục");
    return false;
  }
  
  // Đếm số lượng ảnh và dung lượng đã sử dụng
  int photoCount = 0;
  File file = root.openNextFile();
  
  // Mảng lưu thông tin các file ảnh
  struct {
    String name;
    uint32_t size;
    uint32_t time;
  } photoFiles[MAX_PHOTOS];
  int fileCount = 0;
  
  while (file && file.name() != NULL) {
    String fileName = String(file.name());
    if (fileName.startsWith("/photo_") && fileName.endsWith(".jpg")) {
      photoCount++;
      usedBytes += file.size();
      
      // Lưu thông tin file để sắp xếp sau này
      if (fileCount < MAX_PHOTOS) {
        photoFiles[fileCount].name = fileName;
        photoFiles[fileCount].size = file.size();
        
        // Lấy thời gian từ tên file (photo_TIMESTAMP.jpg)
        String timeStr = fileName.substring(7, fileName.length() - 4);
        photoFiles[fileCount].time = timeStr.toInt();
        
        fileCount++;
      }
    }
    file = root.openNextFile();
  }
  
  // Đóng thư mục gốc sau khi đọc xong
  root.close();
  
  // Tính dung lượng còn trống
  uint64_t freeBytes = cardSize - usedBytes;
  
  Serial.println("Thống kê thẻ SD:");
  Serial.println("- Tổng dung lượng: " + String((double)cardSize / 1024 / 1024, 2) + " MB");
  Serial.println("- Đã sử dụng: " + String((double)usedBytes / 1024 / 1024, 2) + " MB");
  Serial.println("- Còn trống: " + String((double)freeBytes / 1024 / 1024, 2) + " MB");
  Serial.println("- Số lượng ảnh: " + String(photoCount));
  
  // Kiểm tra xem có cần xóa ảnh cũ không
  bool needFreeSpace = (freeBytes < MIN_SD_SPACE) || (photoCount >= MAX_PHOTOS);
  
  // Nếu cần xóa ảnh cũ
  if (needFreeSpace && fileCount > 0) {
    Serial.println("Cần xóa ảnh cũ để giải phóng không gian");
    
    // Sắp xếp ảnh theo thời gian (cũ đến mới)
    for (int i = 0; i < fileCount - 1; i++) {
      for (int j = i + 1; j < fileCount; j++) {
        if (photoFiles[i].time > photoFiles[j].time) {
          // Hoán đổi
          String tempName = photoFiles[i].name;
          uint32_t tempSize = photoFiles[i].size;
          uint32_t tempTime = photoFiles[i].time;
          
          photoFiles[i].name = photoFiles[j].name;
          photoFiles[i].size = photoFiles[j].size;
          photoFiles[i].time = photoFiles[j].time;
          
          photoFiles[j].name = tempName;
          photoFiles[j].size = tempSize;
          photoFiles[j].time = tempTime;
        }
      }
    }
    
    // Xóa ảnh cũ nhất (30% tổng số ảnh)
    int filesToDelete = min(fileCount, max(1, fileCount * 3 / 10));
    Serial.println("Sẽ xóa " + String(filesToDelete) + " ảnh cũ nhất");
    
    for (int i = 0; i < filesToDelete; i++) {
      Serial.println("Xóa file: " + photoFiles[i].name);
      SD_MMC.remove(photoFiles[i].name.c_str());
    }
    
    // Gửi thông báo về MQTT (nếu kết nối)
    if (isMqttConnected) {
      String notifyMsg = "{\"status\":\"storage_cleanup\",\"device\":\"ESP32-CAM\",\"deleted_files\":" + 
                        String(filesToDelete) + ",\"timestamp\":" + String(millis()) + "}";
      mqttClient.publish(mqttTopicStatus.c_str(), notifyMsg.c_str());
    }
    
    // Gửi thông báo về Arduino nếu kết nối
    if (!directModeEnabled) {
      String resultMsg = "{\"status\":\"storage_cleanup\",\"deleted_files\":" + String(filesToDelete) + "}";
      Serial2.println(resultMsg);
    }
  }
  
  return freeBytes >= MIN_SD_SPACE;
}

// Hàm khởi tạo thẻ SD với retry và kiểm tra không gian
bool initSDCard() {
  int retryCount = 0;
  bool success = false;
  
  while (!success && retryCount < MAX_SD_RETRIES) {
    if (!SD_MMC.begin()) {
      Serial.printf("Lỗi khởi tạo thẻ SD lần %d. Thử lại...\n", retryCount + 1);
      retryCount++;
      delay(SD_RETRY_DELAY);
      continue;
    }
    
    if (SD_MMC.cardType() == CARD_NONE) {
      Serial.printf("Không tìm thấy thẻ SD lần %d. Thử lại...\n", retryCount + 1);
      retryCount++;
      delay(SD_RETRY_DELAY);
      continue;
    }
    
    success = true;
    
    // Hiển thị thông tin thẻ nhớ
    uint8_t cardType = SD_MMC.cardType();
    const char* cardTypeNames[] = {"Không có thẻ", "MMC", "SD", "SDHC", "Không xác định"};
    Serial.print("Loại thẻ: ");
    if (cardType < 5) {
      Serial.println(cardTypeNames[cardType]);
    } else {
      Serial.println(cardTypeNames[4]);
    }
    
    uint64_t cardSize = SD_MMC.cardSize() / (1024 * 1024);
    Serial.printf("Dung lượng thẻ SD: %lluMB\n", cardSize);
    
    // Kiểm tra không gian thẻ SD
    checkSDCardSpace();
  }
  
  if (!success) {
    Serial.println("Không thể khởi tạo thẻ SD, sử dụng bộ nhớ trong");
    // Có thể thêm code để sử dụng bộ nhớ trong thay thế
  }
  
  return success;
}

// Hàm khởi tạo camera với retry
bool initCamera() {
  int retryCount = 0;
  bool success = false;
  
  while (!success && retryCount < MAX_RETRIES) {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    
    if (psramFound()) {
      config.frame_size = FRAMESIZE_SVGA;
      config.jpeg_quality = 10;
      config.fb_count = 2;
    } else {
      config.frame_size = FRAMESIZE_VGA;
      config.jpeg_quality = 12;
      config.fb_count = 1;
    }
    
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
      Serial.printf("Lỗi khởi tạo camera lần %d: %d\n", retryCount + 1, err);
      retryCount++;
      delay(RETRY_DELAY);
      continue;
    }
    
    sensor_t * s = esp_camera_sensor_get();
    if (!s) {
      Serial.printf("Lỗi lấy cảm biến camera lần %d\n", retryCount + 1);
      retryCount++;
      delay(RETRY_DELAY);
      continue;
    }
    
    // Cài đặt thông số camera
    s->set_brightness(s, 0);
    s->set_contrast(s, 0);
    s->set_saturation(s, 0);
    s->set_special_effect(s, 0);
    s->set_whitebal(s, 1);
    s->set_awb_gain(s, 1);
    s->set_wb_mode(s, 0);
    s->set_exposure_ctrl(s, 1);
    s->set_aec2(s, 0);
    s->set_gain_ctrl(s, 1);
    s->set_agc_gain(s, 0);
    s->set_gainceiling(s, (gainceiling_t)0);
    s->set_bpc(s, 0);
    s->set_wpc(s, 1);
    s->set_raw_gma(s, 1);
    s->set_lenc(s, 1);
    s->set_hmirror(s, 0);
    s->set_vflip(s, 0);
    s->set_dcw(s, 1);
    s->set_colorbar(s, 0);
    
    success = true;
    errorCount = 0;
  }
  
  return success;
}

// Giải quyết phần camera trực tiếp gửi về MQTT
void sendPhotoToMQTT(camera_fb_t * fb) {
  if (!fb || !isMqttConnected) {
    return;
  }
  
  // Kiểm tra kích thước ảnh
  if (fb->len > 500000) { // Giới hạn 500KB
    Serial.println("Ảnh quá lớn để gửi qua MQTT");
    return;
  }
  
  // Gửi ảnh theo từng phần
  const int chunkSize = 4096; // 4KB mỗi gói
  int numChunks = (fb->len + chunkSize - 1) / chunkSize;
  
  // Gửi thông tin về bức ảnh
  String photoInfo = "{\"type\":\"photo\",\"size\":" + String(fb->len) + 
                     ",\"chunks\":" + String(numChunks) + 
                     ",\"timestamp\":" + String(millis()) + 
                     ",\"direct_mode\":" + String(directModeEnabled ? "true" : "false") + "}";
  mqttClient.publish(mqttTopicStatus.c_str(), photoInfo.c_str());
  
  // Gửi từng phần của bức ảnh
  bool success = true;
  for (int i = 0; i < numChunks; i++) {
    int start = i * chunkSize;
    int end = min(start + chunkSize, (int)fb->len);
    int currentChunkSize = end - start;
    
    // Tạo chủ đề cho phần này
    String chunkTopic = mqttTopicImage + "/chunk/" + String(i);
    
    // Gửi phần dữ liệu
    if (!mqttClient.publish(chunkTopic.c_str(), &fb->buf[start], currentChunkSize, false)) {
      Serial.printf("Lỗi khi gửi phần %d/%d\n", i+1, numChunks);
      success = false;
      break;
    }
    
    // Thêm độ trễ nhỏ giữa các gói để tránh nghẽn
    delay(50);
  }
  
  // Gửi thông báo kết thúc ảnh
  if (success) {
    String completeMsg = "{\"type\":\"photo_complete\",\"timestamp\":" + String(millis()) + "}";
    mqttClient.publish(mqttTopicStatus.c_str(), completeMsg.c_str());
    Serial.println("Đã gửi ảnh qua MQTT thành công");
  }
}

// Cập nhật hàm capturePhotoSaveSD để sử dụng hàm mới
bool capturePhotoSaveSD() {
  if (!cameraInitialized) {
    handleError("Camera chưa được khởi tạo");
    return false;
  }
  
  // Kiểm tra bộ nhớ trước khi chụp
  if (ESP.getFreeHeap() < 100000) { // Ít nhất 100KB trống
    handleError("Bộ nhớ không đủ để chụp ảnh");
    return false;
  }
  
  // Kiểm tra không gian thẻ SD trước khi chụp ảnh
  if (!checkSDCardSpace()) {
    Serial.println("CẢNH BÁO: Thẻ SD gần đầy hoặc quá nhiều ảnh, đã tự động xóa ảnh cũ");
    // Kiểm tra lại sau khi xóa
    if (!checkSDCardSpace()) {
      handleError("Không thể giải phóng đủ không gian trên thẻ SD");
      return false;
    }
  }
  
  // Bật đèn flash
  digitalWrite(FLASH_LED_PIN, HIGH);
  delay(100);
  
  camera_fb_t * fb = NULL;
  bool success = false;
  
  // Chụp ảnh với xử lý lỗi
  fb = esp_camera_fb_get();
  if (!fb) {
    handleError("Lỗi khi chụp ảnh");
    return false;
  }
  
  // Tắt đèn flash
  digitalWrite(FLASH_LED_PIN, LOW);
  
  // Kiểm tra kích thước ảnh
  if (fb->len > 500000) { // Giới hạn 500KB
    handleError("Ảnh quá lớn");
    esp_camera_fb_return(fb);
    return false;
  }
  
  // Tạo tên file dựa trên thời gian
  char filename[32];
  sprintf(filename, "/photo_%lu.jpg", millis());
  
  // Lưu ảnh vào SD với xử lý lỗi
  fs::FS &fs = SD_MMC;
  File file = fs.open(filename, FILE_WRITE);
  if (!file) {
    handleError("Lỗi khi mở file trên thẻ SD");
  } else {
    if (file.write(fb->buf, fb->len)) {
      Serial.printf("Đã lưu ảnh: %s (%u bytes)\n", filename, fb->len);
      success = true;
      errorCount = 0;
    } else {
      handleError("Lỗi khi ghi file");
    }
    file.close();
  }
  
  // Gửi ảnh qua MQTT nếu được kết nối
  if (isMqttConnected) {
    sendPhotoToMQTT(fb);
  }
  
  // Thông báo kết quả qua UART nếu không ở chế độ kết nối trực tiếp
  if (!directModeEnabled) {
    String resultMsg = success ? 
      "{\"status\":\"photo_saved\",\"file\":\"" + String(filename) + "\"}" :
      "{\"status\":\"photo_error\",\"message\":\"Lỗi lưu ảnh\"}";
    Serial2.println(resultMsg);
  }
  
  esp_camera_fb_return(fb);
  return success;
}

// Cập nhật hàm streamMQTT để không phụ thuộc vào thẻ SD
void streamMQTT() {
  if (!streamingEnabled || !isMqttConnected) return;
  
  // Kiểm tra camera đã khởi tạo
  if (!cameraInitialized) {
    Serial.println("Lỗi: Camera chưa được khởi tạo khi stream");
    return;
  }
  
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Lỗi khi lấy frame camera cho streaming");
    return;
  }
  
  // Gửi thông tin frame
  String frameInfo = "{\"type\":\"stream_frame\",\"size\":" + String(fb->len) + 
                     ",\"timestamp\":" + String(millis()) +
                     ",\"direct_mode\":" + String(directModeEnabled ? "true" : "false") + "}";
  mqttClient.publish(mqttTopicStatus.c_str(), frameInfo.c_str());
  
  // Gửi frame qua MQTT
  if (mqttClient.publish(mqttTopicStream.c_str(), fb->buf, fb->len, false)) {
    Serial.println("Đã gửi frame streaming");
  } else {
    Serial.println("Lỗi khi gửi frame streaming qua MQTT");
  }
  
  esp_camera_fb_return(fb);
}

// Kết nối WiFi sử dụng thông tin từ EEPROM
void connectWiFi() {
  if (strlen(ssid) == 0) {
    Serial.println("Chưa có thông tin WiFi, chờ nhận từ Arduino...");
    return;
  }
  
  Serial.print("Đang kết nối WiFi với SSID: ");
  Serial.println(ssid);
  
  // Đặt lại WiFi trước khi kết nối
  WiFi.disconnect(true);
  delay(1000);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true); // Bật tự động kết nối lại
  delay(500);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  const int maxAttempts = 30; // Tăng thời gian chờ
  
  Serial.print("Đang chờ kết nối");
  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Hiển thị mã trạng thái WiFi mỗi 5 lần thử
    if (attempts % 5 == 0) {
      int status = WiFi.status();
      Serial.println();
      Serial.print("Trạng thái WiFi: ");
      switch (status) {
        case WL_CONNECTED: Serial.println("Đã kết nối"); break;
        case WL_NO_SHIELD: Serial.println("Không tìm thấy WiFi shield"); break;
        case WL_IDLE_STATUS: Serial.println("Đang rảnh"); break;
        case WL_NO_SSID_AVAIL: Serial.println("Không tìm thấy SSID"); break;
        case WL_SCAN_COMPLETED: Serial.println("Đã quét xong"); break;
        case WL_CONNECT_FAILED: Serial.println("Kết nối thất bại"); break;
        case WL_CONNECTION_LOST: Serial.println("Mất kết nối"); break;
        case WL_DISCONNECTED: Serial.println("Đã ngắt kết nối"); break;
        default: Serial.println("Không xác định (" + String(status) + ")"); break;
      }
      Serial.print("Đang chờ kết nối");
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nĐã kết nối WiFi");
    Serial.print("Địa chỉ IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Cường độ tín hiệu: ");
    Serial.println(WiFi.RSSI());
    Serial.print("Địa chỉ MAC: ");
    Serial.println(WiFi.macAddress());
    isWifiConfigured = true;
    
    // Gửi thông báo kết nối thành công về Arduino nếu không ở chế độ trực tiếp
    if (!directModeEnabled) {
      Serial2.println("{\"status\":\"wifi_connected\",\"ip\":\"" + WiFi.localIP().toString() + "\"}");
    }
    
    // Kết nối MQTT sau khi có WiFi
    connectMQTT();
  } else {
    Serial.println("\nKhông thể kết nối WiFi sau " + String(attempts) + " lần thử");
    Serial.println("Vui lòng kiểm tra thông tin WiFi:");
    Serial.println("SSID: " + String(ssid));
    Serial.println("Password length: " + String(strlen(password)));
    Serial.println("Trạng thái WiFi cuối cùng: " + String(WiFi.status()));
    isWifiConfigured = false;
    
    // Gửi thông báo lỗi về Arduino nếu không ở chế độ trực tiếp
    if (!directModeEnabled) {
      Serial2.println("{\"status\":\"wifi_error\",\"error\":\"" + String(WiFi.status()) + "\"}");
    }
  }
}

// Kết nối MQTT
void connectMQTT() {
  if (!isWifiConfigured || WiFi.status() != WL_CONNECTED) {
    Serial.println("Không thể kết nối MQTT: WiFi chưa kết nối");
    return;
  }
  
  // Thiết lập chủ đề MQTT
  mqttTopicImage = "garden/" + String(deviceSerial) + "/image";
  mqttTopicStream = "garden/" + String(deviceSerial) + "/stream";
  mqttTopicCommand = "garden/" + String(deviceSerial) + "/command";
  mqttTopicStatus = "garden/" + String(deviceSerial) + "/status";
  
  // Thiết lập server MQTT
  Serial.println("Thiết lập kết nối MQTT đến " + String(mqtt_server) + ":" + String(mqtt_port));
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(mqttCallback);
  
  // Kết nối tới MQTT broker
  String clientId = "ESP32CAM-" + String(deviceSerial);
  Serial.println("Đang kết nối tới MQTT broker với Client ID: " + clientId);

  bool connectSuccess = false;
// Nếu có thông tin xác thực MQTT
if (strlen(mqtt_user) > 0) {
  connectSuccess = mqttClient.connect(clientId.c_str(), mqtt_user, mqtt_pass);
  Serial.println("Kết nối MQTT với xác thực: " + String(mqtt_user));
} else {
  connectSuccess = mqttClient.connect(clientId.c_str());
  Serial.println("Kết nối MQTT không có xác thực");
}
  
  // Thử kết nối với timeout
  unsigned long startAttemptTime = millis();
  int mqttAttempts = 0;
  const int maxMqttAttempts = 3;
  
  while (!mqttClient.connected() && mqttAttempts < maxMqttAttempts) {
    Serial.print("Thử kết nối MQTT lần " + String(mqttAttempts+1) + "... ");
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("Thành công!");
      break;
    } else {
      int mqttState = mqttClient.state();
      String errorMsg = "Thất bại, mã lỗi = " + String(mqttState) + " (";
      
      // Giải thích mã lỗi
      switch (mqttState) {
        case -4: errorMsg += "MQTT_CONNECTION_TIMEOUT"; break;
        case -3: errorMsg += "MQTT_CONNECTION_LOST"; break;
        case -2: errorMsg += "MQTT_CONNECT_FAILED"; break;
        case -1: errorMsg += "MQTT_DISCONNECTED"; break;
        case 1: errorMsg += "MQTT_CONNECT_BAD_PROTOCOL"; break;
        case 2: errorMsg += "MQTT_CONNECT_BAD_CLIENT_ID"; break;
        case 3: errorMsg += "MQTT_CONNECT_UNAVAILABLE"; break;
        case 4: errorMsg += "MQTT_CONNECT_BAD_CREDENTIALS"; break;
        case 5: errorMsg += "MQTT_CONNECT_UNAUTHORIZED"; break;
        default: errorMsg += "UNKNOWN"; break;
      }
      errorMsg += ")";
      
      Serial.println(errorMsg);
      mqttAttempts++;
      
      // Gửi thông báo lỗi cho Arduino nếu không ở chế độ trực tiếp
      if (!directModeEnabled) {
        Serial2.println("{\"status\":\"mqtt_error\",\"error\":\"" + String(mqttState) + "\"}");
      }
      
      delay(2000); // Chờ trước khi thử lại
    }
  }
  
  if (mqttClient.connected()) {
    Serial.println("Đã kết nối tới MQTT broker");
    
    // Đăng ký nhận lệnh
    mqttClient.subscribe(mqttTopicCommand.c_str());
    Serial.println("Đã đăng ký nhận lệnh qua chủ đề: " + mqttTopicCommand);
    
    // Gửi thông báo kết nối
    String statusMsg;
    
    if (directModeEnabled) {
      statusMsg = "{\"status\":\"connected\",\"device\":\"ESP32-CAM\",\"serial\":\"" + 
                  String(deviceSerial) + "\",\"direct_mode\":true,\"timestamp\":" + 
                  String(millis()) + ",\"ip\":\"" + WiFi.localIP().toString() + "\"}";
    } else {
      statusMsg = "{\"status\":\"connected\",\"device\":\"ESP32-CAM\",\"serial\":\"" + 
                  String(deviceSerial) + "\",\"timestamp\":" + String(millis()) + 
                  ",\"ip\":\"" + WiFi.localIP().toString() + "\"}";
    }
    
    if (mqttClient.publish(mqttTopicStatus.c_str(), statusMsg.c_str())) {
      Serial.println("Đã gửi thông báo kết nối qua MQTT");
    } else {
      Serial.println("Lỗi gửi thông báo kết nối qua MQTT");
    }
    
    isMqttConnected = true;
    
    // Gửi thông báo kết nối MQTT thành công cho Arduino nếu không ở chế độ trực tiếp
    if (!directModeEnabled) {
      Serial2.println("{\"status\":\"mqtt_connected\",\"broker\":\"" + String(mqtt_server) + "\"}");
    }
  } else {
    Serial.println("Không thể kết nối MQTT sau " + String(mqttAttempts) + " lần thử");
    Serial.println("Broker: " + String(mqtt_server) + ":" + String(mqtt_port));
    Serial.println("Client ID: " + clientId);
    isMqttConnected = false;
    
    // Gửi thông báo lỗi cho Arduino nếu không ở chế độ trực tiếp
    if (!directModeEnabled) {
      Serial2.println("{\"status\":\"mqtt_failed\",\"attempts\":\"" + String(mqttAttempts) + "\"}");
    }
  }
}

// Sửa đổi hàm mqttCallback để xử lý lệnh streaming mà không phụ thuộc vào thẻ SD
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Chuyển payload thành chuỗi
  char message[length + 1];
  for (int i = 0; i < length; i++) {
    message[i] = (char)payload[i];
  }
  message[length] = '\0';
  
  String topicStr = String(topic);
  String payloadStr = String(message);
  
  Serial.println("Nhận MQTT: " + topicStr + " - " + payloadStr);
  
  // Chuyển tiếp lệnh cho Arduino thông qua UART nếu kết nối với Arduino
  if (!directModeEnabled) {
    Serial2.println(payloadStr);
  }
  
  // Xử lý lệnh dành cho camera
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, payloadStr);
  
  if (!error) {
    // Xử lý lệnh chụp ảnh
    if (doc.containsKey("action") && doc["action"] == "take_photo") {
      takingPhoto = true;
      capturePhotoSaveSD();
      takingPhoto = false;
    }
    
    // Xử lý lệnh streaming - không phụ thuộc vào thẻ SD
    else if (doc.containsKey("action") && doc["action"] == "stream") {
      if (doc.containsKey("enable")) {
        bool newStreamState = doc["enable"].as<bool>();
        
        // Thiết lập lại độ phân giải camera
        sensor_t * s = esp_camera_sensor_get();
        if (newStreamState) {
          Serial.println("Bật streaming - thiết lập độ phân giải thấp");
          s->set_framesize(s, FRAMESIZE_QVGA); // 320x240 cho streaming
          
          // Thông báo đã bắt đầu stream
          String statusMsg = "{\"status\":\"stream_started\",\"device\":\"ESP32-CAM\",\"timestamp\":" + String(millis()) + "}";
          mqttClient.publish(mqttTopicStatus.c_str(), statusMsg.c_str());
        } else {
          Serial.println("Tắt streaming - thiết lập lại độ phân giải cao");
          s->set_framesize(s, psramFound() ? FRAMESIZE_SVGA : FRAMESIZE_VGA); // Quay lại độ phân giải cao
          
          // Thông báo đã dừng stream
          String statusMsg = "{\"status\":\"stream_stopped\",\"device\":\"ESP32-CAM\",\"timestamp\":" + String(millis()) + "}";
          mqttClient.publish(mqttTopicStatus.c_str(), statusMsg.c_str());
        }
        
        // Cập nhật trạng thái stream
        streamingEnabled = newStreamState;
      }
    }
  }
}

// Cập nhật hàm lưu cấu hình WiFi với mã hóa
void saveWiFiConfig() {
  EEPROM.write(WIFI_SAVED_FLAG, 1);
  
  // Mã hóa dữ liệu trước khi lưu
  uint8_t ssidData[32];
  uint8_t passData[32];
  uint8_t serialData[32];
  uint8_t mqttServerData[40];
  
  memcpy(ssidData, ssid, sizeof(ssid));
  memcpy(passData, password, sizeof(password));
  memcpy(serialData, deviceSerial, sizeof(deviceSerial));
  memcpy(mqttServerData, mqtt_server, sizeof(mqtt_server));
  
  encryptData(ssidData, sizeof(ssidData));
  encryptData(passData, sizeof(passData));
  encryptData(serialData, sizeof(serialData));
  encryptData(mqttServerData, sizeof(mqttServerData));
  
  for (int i = 0; i < 32; i++) {
    EEPROM.write(WIFI_SSID_ADDR + i, ssidData[i]);
    EEPROM.write(WIFI_PASS_ADDR + i, passData[i]);
    EEPROM.write(DEVICE_SERIAL_ADDR + i, serialData[i]);
  }
  
  for (int i = 0; i < 40; i++) {
    EEPROM.write(MQTT_SERVER_ADDR + i, mqttServerData[i]);
  }
  
  // Lưu MQTT port
  EEPROM.write(MQTT_PORT_ADDR, (mqtt_port >> 8) & 0xFF);
  EEPROM.write(MQTT_PORT_ADDR + 1, mqtt_port & 0xFF);
  
  EEPROM.commit();
  Serial.println("Đã lưu cấu hình WiFi và MQTT đã mã hóa vào EEPROM");
}

// Cập nhật hàm tải cấu hình WiFi với giải mã
void loadWiFiConfig() {
  if (EEPROM.read(WIFI_SAVED_FLAG) == 1) {
    uint8_t ssidData[32];
    uint8_t passData[32];
    uint8_t serialData[32];
    uint8_t mqttServerData[40];
    
    for (int i = 0; i < 32; i++) {
      ssidData[i] = EEPROM.read(WIFI_SSID_ADDR + i);
      passData[i] = EEPROM.read(WIFI_PASS_ADDR + i);
      serialData[i] = EEPROM.read(DEVICE_SERIAL_ADDR + i);
    }
    
    for (int i = 0; i < 40; i++) {
      mqttServerData[i] = EEPROM.read(MQTT_SERVER_ADDR + i);
    }
    
    decryptData(ssidData, sizeof(ssidData));
    decryptData(passData, sizeof(passData));
    decryptData(serialData, sizeof(serialData));
    decryptData(mqttServerData, sizeof(mqttServerData));
    
    memcpy(ssid, ssidData, sizeof(ssid));
    memcpy(password, passData, sizeof(password));
    memcpy(deviceSerial, serialData, sizeof(deviceSerial));
    memcpy(mqtt_server, mqttServerData, sizeof(mqtt_server));
    
    // Đọc MQTT port
    mqtt_port = (EEPROM.read(MQTT_PORT_ADDR) << 8) | EEPROM.read(MQTT_PORT_ADDR + 1);
    
    Serial.println("Đã tải cấu hình WiFi và MQTT đã mã hóa từ EEPROM");
    Serial.print("SSID: ");
    Serial.println(ssid);
    Serial.print("Device Serial: ");
    Serial.println(deviceSerial);
    Serial.print("MQTT Server: ");
    Serial.println(mqtt_server);
    Serial.print("MQTT Port: ");
    Serial.println(mqtt_port);
  } else {
    Serial.println("Không tìm thấy cấu hình WiFi trong EEPROM");
  }
}

// Sửa đổi hàm processUARTData để xử lý lệnh streaming từ Arduino không phụ thuộc vào thẻ SD
void processUARTData(String data) {
  DynamicJsonDocument doc(512);
  DeserializationError error = deserializeJson(doc, data);
  
  if (error) {
    Serial.println("Lỗi phân tích JSON: " + String(error.c_str()));
    return;
  }
  
  // Xử lý lệnh WiFi
  if (doc.containsKey("command") && doc["command"] == "wifi_connect") {
    strlcpy(ssid, doc["ssid"].as<String>().c_str(), sizeof(ssid));
    strlcpy(password, doc["password"].as<String>().c_str(), sizeof(password));
    
    Serial.println("Nhận thông tin WiFi từ Arduino:");
    Serial.println("SSID: " + String(ssid));
    Serial.println("Password length: " + String(strlen(password)));
    
    // Ghi nhớ cấu hình WiFi đã mã hóa
    saveWiFiConfig();
    
    // Kết nối WiFi
    connectWiFi();
  }
  
  // Xử lý lệnh MQTT
  else if (doc.containsKey("command") && doc["command"] == "mqtt_config") {
    strlcpy(mqtt_server, doc["server"].as<String>().c_str(), sizeof(mqtt_server));
    mqtt_port = doc["port"].as<int>();
    
    if (doc.containsKey("username") && doc.containsKey("password")) {
      strlcpy(mqtt_user, doc["username"].as<String>().c_str(), sizeof(mqtt_user));
      strlcpy(mqtt_pass, doc["password"].as<String>().c_str(), sizeof(mqtt_pass));
    }
    
    Serial.println("Nhận cấu hình MQTT từ Arduino:");
    Serial.println("Server: " + String(mqtt_server));
    Serial.println("Port: " + String(mqtt_port));
    
    // Ghi nhớ cấu hình MQTT đã mã hóa
    saveWiFiConfig();
    
    // Kết nối MQTT
    if (WiFi.status() == WL_CONNECTED) {
      connectMQTT();
    }
  }
  
  // Xử lý lệnh thiết lập device serial
  else if (doc.containsKey("command") && doc["command"] == "set_serial") {
    strlcpy(deviceSerial, doc["serial"].as<String>().c_str(), sizeof(deviceSerial));
    
    Serial.println("Nhận device serial từ Arduino: " + String(deviceSerial));
    
    // Ghi nhớ device serial đã mã hóa
    saveWiFiConfig();
    
    // Cập nhật chủ đề MQTT nếu đã kết nối
    if (isMqttConnected) {
      mqttClient.disconnect();
      connectMQTT();
    }
  }
  
  // Xử lý lệnh chụp ảnh từ Arduino
  else if (doc.containsKey("command") && doc["command"] == "take_photo") {
    Serial.println("Nhận lệnh chụp ảnh từ Arduino");
    takingPhoto = true;
    bool result = capturePhotoSaveSD();
    takingPhoto = false;
    
    // Gửi kết quả về Arduino
    String resultMsg = result ? "{\"status\":\"photo_success\"}" : "{\"status\":\"photo_failed\"}";
    Serial2.println(resultMsg);
  }
  
  // Xử lý lệnh streaming từ Arduino - không phụ thuộc vào thẻ SD
  else if (doc.containsKey("command") && doc["command"] == "stream") {
    if (doc.containsKey("enable")) {
      bool newStreamState = doc["enable"].as<bool>();
      Serial.println("Nhận lệnh " + String(newStreamState ? "bật" : "tắt") + " stream từ Arduino");
      
      // Thiết lập lại độ phân giải camera
      sensor_t * s = esp_camera_sensor_get();
      if (newStreamState) {
        Serial.println("Bật streaming - thiết lập độ phân giải thấp");
        s->set_framesize(s, FRAMESIZE_QVGA); // 320x240 cho streaming
        
        if (isMqttConnected) {
          // Thông báo đã bắt đầu stream
          String statusMsg = "{\"status\":\"stream_started\",\"device\":\"ESP32-CAM\",\"timestamp\":" + String(millis()) + "}";
          mqttClient.publish(mqttTopicStatus.c_str(), statusMsg.c_str());
        }
      } else {
        Serial.println("Tắt streaming - thiết lập lại độ phân giải cao");
        s->set_framesize(s, psramFound() ? FRAMESIZE_SVGA : FRAMESIZE_VGA); // Quay lại độ phân giải cao
        
        if (isMqttConnected) {
          // Thông báo đã dừng stream
          String statusMsg = "{\"status\":\"stream_stopped\",\"device\":\"ESP32-CAM\",\"timestamp\":" + String(millis()) + "}";
          mqttClient.publish(mqttTopicStatus.c_str(), statusMsg.c_str());
        }
      }
      
      // Cập nhật trạng thái stream
      streamingEnabled = newStreamState;
      
      // Gửi kết quả về Arduino
      String resultMsg = "{\"status\":\"streaming_" + String(streamingEnabled ? "enabled" : "disabled") + "\"}";
      Serial2.println(resultMsg);
    }
  }
}

void setup() {
  // Tắt brown-out detector
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  
  // Khởi tạo GPIO
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);
  
  // Khởi tạo Serial cho debug
  Serial.begin(115200);
  Serial.println("ESP32-CAM Garden IOT");
  Serial.println("==========================================");
  
  // Khởi tạo Serial2 để giao tiếp với Arduino
  Serial2.begin(UART_BAUD_RATE, SERIAL_8N1, RX_PIN, TX_PIN);
  Serial.println("Đã khởi tạo UART cho kết nối Arduino: pins RX=" + String(RX_PIN) + ", TX=" + String(TX_PIN) + " baud=" + String(UART_BAUD_RATE));
  
  // Khởi tạo EEPROM
  EEPROM.begin(EEPROM_SIZE);
  
  // Tải cấu hình WiFi đã mã hóa
  loadWiFiConfig();
  Serial.println("Thông tin WiFi đã tải: SSID=" + String(ssid) + ", Serial=" + String(deviceSerial));
  
  // Khởi tạo camera với retry - đưa lên trước khi khởi tạo thẻ SD
  if (initCamera()) {
    Serial.println("Đã khởi tạo camera");
    cameraInitialized = true;
  } else {
    Serial.println("Lỗi khởi tạo camera");
    cameraInitialized = false;
  }
  
  // Khởi tạo thẻ SD với retry (nếu thất bại, vẫn tiếp tục)
  if (!initSDCard()) {
    Serial.println("Không thể khởi tạo thẻ SD, tiếp tục mà không sử dụng thẻ SD");
  }
  
  // Thử kết nối WiFi nếu đã có thông tin và đặt timeout nếu không phản hồi từ Arduino
  lastArduinoContact = millis();
  
  // Gửi thông báo sẵn sàng đến Arduino
  Serial.println("Gửi thông báo sẵn sàng đến Arduino qua UART");
  Serial2.println("{\"status\":\"ready\",\"device\":\"ESP32-CAM\"}");
  
  // Phần còn lại của setup() giữ nguyên
  // ... existing code ...
}

void loop() {
  unsigned long currentMillis = millis();
  
  // Xử lý dữ liệu từ UART với timeout
  while (Serial2.available()) {
    char c = Serial2.read();
    lastUartActivity = currentMillis;
    lastArduinoContact = currentMillis; // Cập nhật thời gian liên lạc với Arduino
    
    if (c == '\n') {
      if (uartBuffer.length() > 0) {
        Serial.println(">>> Đã nhận dữ liệu UART đầy đủ: " + uartBuffer);
        processUARTData(uartBuffer);
        uartBuffer = "";
        errorCount = 0; // Reset bộ đếm lỗi khi nhận được dữ liệu hợp lệ
      }
    } else if (c != '\r') {
      uartBuffer += c;
    }
  }
  
  // Kiểm tra timeout UART
  if (uartBuffer.length() > 0 && currentMillis - lastUartActivity > UART_TIMEOUT) {
    handleError("UART timeout");
    processUARTData(uartBuffer);
    uartBuffer = "";
  }
  
  // Kiểm tra thời gian kết nối với Arduino
  if (!directModeEnabled && (currentMillis - lastArduinoContact > ARDUINO_TIMEOUT)) {
    Serial.println("Không nhận được dữ liệu từ Arduino trong " + String(ARDUINO_TIMEOUT/1000) + " giây");
    Serial.println("Chuyển sang chế độ kết nối trực tiếp đến WiFi và MQTT");
    directModeEnabled = true;
    
    // Nếu đã có thông tin WiFi trong EEPROM, kết nối trực tiếp
    if (strlen(ssid) > 0) {
      connectWiFi();
    }
  }
  
  // Xử lý kết nối MQTT với retry
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      static unsigned long lastMqttRetry = 0;
      if (currentMillis - lastMqttRetry > 5000) {
        lastMqttRetry = currentMillis;
        connectMQTT();
      }
    } else {
      mqttClient.loop();
      errorCount = 0; // Reset bộ đếm lỗi khi MQTT hoạt động
      
      // Gửi trạng thái định kỳ khi ở chế độ kết nối trực tiếp
      if (directModeEnabled && (currentMillis - lastStatusTime > STATUS_INTERVAL)) {
        String statusMsg = "{\"status\":\"active\",\"device\":\"ESP32-CAM\",\"serial\":\"" + 
                          String(deviceSerial) + "\",\"direct_mode\":true,\"timestamp\":" + 
                          String(millis()) + ",\"ip\":\"" + WiFi.localIP().toString() + "\"}";
        
        mqttClient.publish(mqttTopicStatus.c_str(), statusMsg.c_str());
        lastStatusTime = currentMillis;
      }
    }
  } else if (isWifiConfigured) {
    static unsigned long lastReconnectAttempt = 0;
    if (currentMillis - lastReconnectAttempt > 30000) {
      lastReconnectAttempt = currentMillis;
      handleError("Mất kết nối WiFi");
      connectWiFi();
    }
  }
  
  // Streaming qua MQTT với kiểm tra lỗi
  if (streamingEnabled && isMqttConnected && currentMillis - lastStreamTime > STREAM_INTERVAL) {
    if (!cameraInitialized) {
      handleError("Camera không khả dụng cho streaming");
      streamingEnabled = false;
    } else {
      streamMQTT();
      lastStreamTime = currentMillis;
      errorCount = 0; // Reset bộ đếm lỗi khi streaming thành công
    }
  }
  
  // Chụp ảnh tự động khi ở chế độ kết nối trực tiếp (tùy chọn)
  // Bạn có thể bỏ phần này nếu không muốn ESP32-CAM tự động chụp ảnh
  if (directModeEnabled && isMqttConnected && currentMillis - lastPhotoTime > PHOTO_INTERVAL) {
    Serial.println("Chụp ảnh tự động trong chế độ kết nối trực tiếp");
    takingPhoto = true;
    capturePhotoSaveSD();
    takingPhoto = false;
    lastPhotoTime = currentMillis;
  }
  
  // Kiểm tra định kỳ không gian thẻ SD
  static unsigned long lastSDCheck = 0;
  if (currentMillis - lastSDCheck > 3600000) { // Kiểm tra mỗi 1 giờ
    lastSDCheck = currentMillis;
    Serial.println("Kiểm tra định kỳ không gian thẻ SD");
    checkSDCardSpace();
  }
  
  // Hiển thị trạng thái định kỳ
  static unsigned long lastDebugTime = 0;
  if (currentMillis - lastDebugTime > 10000) { // 10 giây
    Serial.println("=== TRẠNG THÁI HIỆN TẠI ===");
    Serial.println("WiFi: " + String(isWifiConfigured ? "Đã cấu hình" : "Chưa cấu hình"));
    if (isWifiConfigured) {
      Serial.println("Trạng thái WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Đã kết nối" : "Mất kết nối"));
      Serial.println("SSID: " + String(ssid));
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("IP: " + WiFi.localIP().toString());
        Serial.println("RSSI: " + String(WiFi.RSSI()) + " dBm");
      }
    }
    Serial.println("MQTT: " + String(isMqttConnected ? "Đã kết nối" : "Chưa kết nối"));
    Serial.println("Camera: " + String(cameraInitialized ? "Đã khởi tạo" : "Lỗi"));
    Serial.println("Streaming: " + String(streamingEnabled ? "Đang hoạt động" : "Tắt"));
    Serial.println("Số lỗi: " + String(errorCount));
    Serial.println("===========================");
    lastDebugTime = currentMillis;
  }
} 