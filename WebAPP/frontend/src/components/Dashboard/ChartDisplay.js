import React, { useState, useRef, useEffect } from 'react';
import { Box, Paper, Typography, Divider, ToggleButtonGroup, ToggleButton, Stack } from '@mui/material';
import { Line, Bar } from 'react-chartjs-2';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import BarChartIcon from '@mui/icons-material/BarChart';

// ChartJS registration should happen in the main Dashboard or App component
// ChartJS.register(...)

const ChartDisplay = ({ chartData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDarkMode = theme.palette.mode === 'dark';
  const [chartType, setChartType] = useState('line');
  const chartRef = useRef(null);
  const chartContainerRef = useRef(null);
  
  // Cleanup chart khi component unmount hoặc khi chartType thay đổi
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [chartType]);

  const handleChartTypeChange = (event, newType) => {
    if (newType !== null) {
      // Hủy chart instance hiện tại trước khi đổi loại
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      setChartType(newType);
    }
  };

  // Cấu hình chung cho cả hai loại biểu đồ
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: !isMobile,
        position: 'top',
        labels: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : theme.palette.text.primary,
          usePointStyle: true,
          pointStyle: chartType === 'bar' ? 'rect' : 'circle',
          font: {
            size: 12,
            weight: 500
          }
        }
      },
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(42, 45, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : theme.palette.text.primary,
        bodyColor: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : theme.palette.text.secondary,
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        boxPadding: 3,
        usePointStyle: true,
        titleFont: {
          weight: 'bold'
        },
        callbacks: {
          // Định dạng hiển thị giá trị với đơn vị phù hợp
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              let unit = '';
              if (label.includes('Nhiệt độ')) unit = '°C';
              else unit = '%';
              label += context.parsed.y + unit;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderDash: chartType === 'bar' ? [5, 5] : undefined,
        },
        ticks: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : theme.palette.text.secondary,
          font: {
            size: 11
          },
          padding: 5,
          callback: function(value) {
            return value + (value < 100 ? '%' : '');
          }
        },
        beginAtZero: true,
        suggestedMax: 100,
      },
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: isMobile ? 6 : 12,
          color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : theme.palette.text.secondary,
          font: {
            size: 11
          },
          padding: 5
        },
        grid: {
          color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          display: chartType === 'bar' ? false : true,
        }
      }
    }
  };

  // Cấu hình riêng cho biểu đồ cột
  const barOptions = {
    ...options,
    barPercentage: 0.8,
    categoryPercentage: 0.9,
    borderRadius: 4,
    borderSkipped: false,
  };
  
  // Điều chỉnh dữ liệu cho biểu đồ cột để hiển thị rõ ràng hơn
  const getBarData = () => {
    if (!chartData) return null;
    
    // Copy dữ liệu để tránh thay đổi dữ liệu gốc
    const barData = {
      labels: chartData.labels,
      datasets: chartData.datasets.map(dataset => ({
        ...dataset,
        // Tối ưu hóa hiển thị cho biểu đồ cột
        backgroundColor: dataset.borderColor.replace(')', ', 0.7)').replace('rgb', 'rgba'),
        borderColor: dataset.borderColor,
        borderWidth: 1,
        hoverBackgroundColor: dataset.borderColor.replace(')', ', 0.9)').replace('rgb', 'rgba'),
        hoverBorderColor: dataset.borderColor,
        barThickness: isMobile ? 12 : 16,
        maxBarThickness: 25
      }))
    };
    
    return barData;
  };

  // Sửa lại hàm callback lấy chart instance
  const getChartInstance = (chart) => {
    if (chart !== null) {
      chartRef.current = chart;
    }
  };

  // Sửa lại cách render chart để tránh lỗi khi component unmount
  const renderChart = () => {
    if (!chartData) {
      return (
        <Typography sx={{ textAlign: 'center', pt: 4 }}>Đang tải dữ liệu biểu đồ...</Typography>
      );
    }

    // Đảm bảo rằng chartData không bị thay đổi đột ngột
    try {
      if (chartType === 'line') {
        return (
          <Line 
            data={chartData} 
            options={options} 
            ref={getChartInstance}
            key={`line-chart-${chartData?.labels?.length || 0}`}
          />
        );
      } else {
        return (
          <Bar 
            data={getBarData()} 
            options={barOptions} 
            ref={getChartInstance}
            key={`bar-chart-${chartData?.labels?.length || 0}`}
          />
        );
      }
    } catch (error) {
      console.error("Error rendering chart:", error);
      return (
        <Typography sx={{ textAlign: 'center', pt: 4, color: 'error.main' }}>
          Lỗi hiển thị biểu đồ. Vui lòng thử lại.
        </Typography>
      );
    }
  };

  return (
    <Box sx={{ mt: { xs: 3, sm: 4 } }}>
      <Stack 
        direction="row" 
        alignItems="center" 
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 1 }}
      >
        <Typography
          variant={isMobile ? "h6" : "h5"}
          sx={{
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            color: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'inherit',
            textShadow: isDarkMode ? '0 0 1px rgba(255, 255, 255, 0.3)' : 'none',
            fontWeight: isDarkMode ? 600 : 500
          }}
        >
          Biểu đồ dữ liệu 24 giờ qua
        </Typography>
        
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={handleChartTypeChange}
          aria-label="loại biểu đồ"
          size={isMobile ? "small" : "medium"}
          sx={{
            '.MuiToggleButtonGroup-grouped': {
              border: isDarkMode 
                ? '1px solid rgba(255, 255, 255, 0.12)' 
                : '1px solid rgba(0, 0, 0, 0.12)',
              '&.Mui-selected': {
                backgroundColor: isDarkMode 
                  ? 'rgba(76, 175, 80, 0.2)' 
                  : 'rgba(76, 175, 80, 0.1)',
                color: isDarkMode ? '#7bed7b' : '#2e7d32',
                '&:hover': {
                  backgroundColor: isDarkMode 
                    ? 'rgba(76, 175, 80, 0.35)' 
                    : 'rgba(76, 175, 80, 0.2)',
                }
              },
              '&:hover': {
                backgroundColor: isDarkMode 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.03)',
              }
            }
          }}
        >
          <ToggleButton value="line" aria-label="biểu đồ đường">
            <TimelineIcon sx={{ mr: isMobile ? 0 : 0.5 }} />
            {!isMobile && 'Đường'}
          </ToggleButton>
          <ToggleButton value="bar" aria-label="biểu đồ cột">
            <BarChartIcon sx={{ mr: isMobile ? 0 : 0.5 }} />
            {!isMobile && 'Cột'}
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      
      <Divider sx={{ mb: 2, borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : undefined }} />
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1, sm: 2 },
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: isDarkMode ? 'rgba(42, 45, 50, 0.9)' : 'background.paper',
          boxShadow: isDarkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.05)',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'divider'
        }}
      >
        <Box 
          ref={chartContainerRef}
          sx={{ height: { xs: 300, sm: 350, md: 400 } }}
        >
          {renderChart()}
        </Box>
      </Paper>
    </Box>
  );
};

export default ChartDisplay;
