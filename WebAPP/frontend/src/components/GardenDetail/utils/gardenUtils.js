// src/utils/gardenUtils.js
export const getDayNameVi = (day) => {
  switch (day.toLowerCase()) {
    case 'monday': return 'Thứ Hai';
    case 'tuesday': return 'Thứ Ba';
    case 'wednesday': return 'Thứ Tư';
    case 'thursday': return 'Thứ Năm';
    case 'friday': return 'Thứ Sáu';
    case 'saturday': return 'Thứ Bảy';
    case 'sunday': return 'Chủ Nhật';
    default: return day;
  }
};

export const getShortDayNameVi = (day) => {
  switch (day.toLowerCase()) {
    case 'monday': return 'T2';
    case 'tuesday': return 'T3';
    case 'wednesday': return 'T4';
    case 'thursday': return 'T5';
    case 'friday': return 'T6';
    case 'saturday': return 'T7';
    case 'sunday': return 'CN';
    default: return day;
  }
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Không xác định';
  
  const date = new Date(timestamp);
  
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
