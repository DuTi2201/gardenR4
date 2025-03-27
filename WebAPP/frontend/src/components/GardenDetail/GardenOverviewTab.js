// src/components/GardenDetail/GardenOverviewTab.js
import React from 'react';
import {
  Grid, Typography, Paper, Divider, Card, CardContent, Box, useTheme, alpha
} from '@mui/material';
import ConnectionStatus from '../ConnectionStatus'; // Adjust path if needed
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import OpacityIcon from '@mui/icons-material/Opacity';
import DeviceThermostatIcon from '@mui/icons-material/DeviceThermostat';
import GrassIcon from '@mui/icons-material/Grass';
import PlaceIcon from '@mui/icons-material/Place';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LightModeIcon from '@mui/icons-material/LightMode';

const GardenOverviewTab = ({ garden, sensorData, isOffline, lastConnectedDate, createdDate }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3.5, 
            mb: 3, 
            borderRadius: '20px',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'transparent',
            backgroundImage: isDarkMode
              ? 'linear-gradient(135deg, rgba(38, 50, 56, 0.9) 0%, rgba(55, 71, 79, 0.8) 100%)'
              : 'linear-gradient(135deg, rgba(236, 239, 241, 0.8) 0%, rgba(255, 255, 255, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            boxShadow: isDarkMode 
              ? '0 10px 30px rgba(0, 0, 0, 0.25)' 
              : '0 10px 30px rgba(0, 0, 0, 0.1)',
            border: isDarkMode 
              ? '1px solid rgba(255, 255, 255, 0.05)' 
              : '1px solid rgba(0, 0, 0, 0.02)',
            transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
            '&:hover': {
              boxShadow: isDarkMode 
                ? '0 15px 35px rgba(0, 0, 0, 0.3), 0 0 15px rgba(76, 175, 80, 0.2)' 
                : '0 15px 35px rgba(0, 0, 0, 0.1), 0 0 15px rgba(76, 175, 80, 0.15)',
              transform: 'translateY(-5px)'
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: !isOffline 
                ? 'linear-gradient(90deg, #43a047, #66bb6a)' 
                : isDarkMode 
                  ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))' 
                  : 'linear-gradient(90deg, rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.02))',
            }
          }} 
          className="garden-card"
        >
          {/* Decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: '-10%',
              right: '-5%',
              width: '250px',
              height: '250px',
              borderRadius: '50%',
              background: isDarkMode
                ? 'radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0) 70%)'
                : 'radial-gradient(circle, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0) 70%)',
              filter: 'blur(30px)',
              zIndex: 0,
            }}
          />
          
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start', 
              mb: 2 
            }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 1, 
                  background: isDarkMode 
                    ? 'linear-gradient(90deg, #86f386 0%, #5bc75b 100%)' 
                    : 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.5px',
                }}
              >
                {garden.name}
              </Typography>
              <ConnectionStatus
                isConnected={!isOffline}
                lastConnected={lastConnectedDate}
                size="medium"
                variant="badge"
                showText={true}
              />
            </Box>
            
            <Divider sx={{ 
              mb: 2.5, 
              opacity: 0.7,
              background: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)'
            }} />
            
            <Typography 
              variant="body1" 
              paragraph 
              sx={{ 
                mb: 3, 
                color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.7)',
                fontWeight: 400,
                lineHeight: 1.6,
                fontSize: '1rem',
                letterSpacing: '0.2px',
                backgroundColor: isDarkMode 
                  ? 'rgba(0, 0, 0, 0.15)' 
                  : 'rgba(255, 255, 255, 0.5)',
                borderRadius: '12px',
                padding: 2,
                border: isDarkMode 
                  ? '1px solid rgba(255, 255, 255, 0.05)' 
                  : '1px solid rgba(0, 0, 0, 0.03)',
                backdropFilter: 'blur(5px)',
              }}
            >
              {garden.description !== 'Không có mô tả' ? garden.description : 'Không có mô tả'}
            </Typography>
            
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 1.5,
                  backgroundColor: isDarkMode 
                    ? alpha(theme.palette.primary.dark, 0.15)
                    : alpha(theme.palette.primary.light, 0.15),
                  borderRadius: '12px',
                  padding: 1.5,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: isDarkMode 
                      ? alpha(theme.palette.primary.dark, 0.2)
                      : alpha(theme.palette.primary.light, 0.2),
                    transform: 'translateX(5px)'
                  }
                }}>
                  <Box sx={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: isDarkMode 
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(76, 175, 80, 0.15)', 
                    color: isDarkMode ? '#7bed7b' : '#2e7d32',
                    mr: 2,
                    boxShadow: isDarkMode 
                      ? '0 4px 8px rgba(0, 0, 0, 0.15)'
                      : '0 4px 8px rgba(76, 175, 80, 0.15)',
                  }}>
                    <DeviceThermostatIcon />
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500,
                      color: isDarkMode ? '#fff' : '#263238',
                      fontSize: '0.95rem'
                    }}
                  >
                    <Box component="span" sx={{ opacity: 0.7, mr: 1 }}>Mã serial:</Box> 
                    <Box component="span" sx={{ fontWeight: 600 }}>{garden.device_serial || '--'}</Box>
                  </Typography>
                </Box>
              </Grid>
              
              {garden.has_camera && (
                <Grid item xs={12} sm={6}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 1.5,
                    backgroundColor: isDarkMode 
                      ? alpha(theme.palette.primary.dark, 0.15)
                      : alpha(theme.palette.primary.light, 0.15),
                    borderRadius: '12px',
                    padding: 1.5,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: isDarkMode 
                        ? alpha(theme.palette.primary.dark, 0.2)
                        : alpha(theme.palette.primary.light, 0.2),
                      transform: 'translateX(5px)'
                    }
                  }}>
                    <Box sx={{ 
                      width: '38px', 
                      height: '38px', 
                      borderRadius: '10px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: isDarkMode 
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(76, 175, 80, 0.15)', 
                      color: isDarkMode ? '#7bed7b' : '#2e7d32',
                      mr: 2,
                      boxShadow: isDarkMode 
                        ? '0 4px 8px rgba(0, 0, 0, 0.15)'
                        : '0 4px 8px rgba(76, 175, 80, 0.15)',
                    }}>
                      <CameraAltIcon />
                    </Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500,
                        color: isDarkMode ? '#fff' : '#263238',
                        fontSize: '0.95rem'
                      }}
                    >
                      <Box component="span" sx={{ opacity: 0.7, mr: 1 }}>Mã Camera:</Box> 
                      <Box component="span" sx={{ fontWeight: 600 }}>{garden.camera_serial || 'N/A'}</Box>
                    </Typography>
                  </Box>
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 1.5,
                  backgroundColor: isDarkMode 
                    ? alpha(theme.palette.primary.dark, 0.15)
                    : alpha(theme.palette.primary.light, 0.15),
                  borderRadius: '12px',
                  padding: 1.5,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: isDarkMode 
                      ? alpha(theme.palette.primary.dark, 0.2)
                      : alpha(theme.palette.primary.light, 0.2),
                    transform: 'translateX(5px)'
                  }
                }}>
                  <Box sx={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: isDarkMode 
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(76, 175, 80, 0.15)', 
                    color: isDarkMode ? '#7bed7b' : '#2e7d32',
                    mr: 2,
                    boxShadow: isDarkMode 
                      ? '0 4px 8px rgba(0, 0, 0, 0.15)'
                      : '0 4px 8px rgba(76, 175, 80, 0.15)',
                  }}>
                    <CalendarTodayIcon />
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500,
                      color: isDarkMode ? '#fff' : '#263238',
                      fontSize: '0.95rem'
                    }}
                  >
                    <Box component="span" sx={{ opacity: 0.7, mr: 1 }}>Ngày tạo:</Box> 
                    <Box component="span" sx={{ fontWeight: 600 }}>{createdDate ? createdDate.toLocaleDateString('vi-VN') : '--'}</Box>
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 1.5,
                  backgroundColor: isDarkMode 
                    ? alpha(theme.palette.primary.dark, 0.15)
                    : alpha(theme.palette.primary.light, 0.15),
                  borderRadius: '12px',
                  padding: 1.5,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: isDarkMode 
                      ? alpha(theme.palette.primary.dark, 0.2)
                      : alpha(theme.palette.primary.light, 0.2),
                    transform: 'translateX(5px)'
                  }
                }}>
                  <Box sx={{ 
                    width: '38px', 
                    height: '38px', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: isDarkMode 
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(76, 175, 80, 0.15)', 
                    color: isDarkMode ? '#7bed7b' : '#2e7d32',
                    mr: 2,
                    boxShadow: isDarkMode 
                      ? '0 4px 8px rgba(0, 0, 0, 0.15)'
                      : '0 4px 8px rgba(76, 175, 80, 0.15)',
                  }}>
                    <AccessTimeIcon />
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500,
                      color: isDarkMode ? '#fff' : '#263238',
                      fontSize: '0.95rem'
                    }}
                  >
                    <Box component="span" sx={{ opacity: 0.7, mr: 1 }}>Kết nối cuối:</Box> 
                    <Box component="span" sx={{ fontWeight: 600 }}>{lastConnectedDate ? lastConnectedDate.toLocaleString('vi-VN') : '--'}</Box>
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Sensor Data */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Card 
              className="sensor-card" 
              elevation={0}
              sx={{ 
                borderRadius: '18px', 
                height: '100%',
                backgroundColor: isDarkMode
                  ? alpha(theme.palette.background.paper, 0.8)  
                  : alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isDarkMode 
                  ? '0 10px 30px rgba(0, 0, 0, 0.25)' 
                  : '0 10px 30px rgba(0, 0, 0, 0.07)',
                border: isDarkMode 
                  ? '1px solid rgba(255, 255, 255, 0.05)' 
                  : '1px solid rgba(0, 0, 0, 0.03)',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: isDarkMode 
                    ? '0 15px 35px rgba(0, 0, 0, 0.35), 0 0 15px rgba(76, 175, 80, 0.3)' 
                    : '0 15px 35px rgba(0, 0, 0, 0.1), 0 0 15px rgba(76, 175, 80, 0.2)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: isDarkMode 
                    ? 'linear-gradient(90deg, #43a047, #66bb6a)' 
                    : 'linear-gradient(90deg, #2e7d32, #4caf50)',
                  zIndex: 10
                }
              }}
            >
              {/* Decorative elements */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '-15%',
                  right: '-10%',
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: isDarkMode
                    ? 'radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0) 70%)'
                    : 'radial-gradient(circle, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0) 70%)',
                  filter: 'blur(30px)',
                  zIndex: 0,
                }}
              />
              
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 3,
                }}>
                  <Box sx={{ 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: isDarkMode 
                      ? 'linear-gradient(45deg, rgba(76, 175, 80, 0.8), rgba(102, 187, 106, 0.9))' 
                      : 'linear-gradient(45deg, rgba(76, 175, 80, 0.9), rgba(102, 187, 106, 1))',
                    boxShadow: '0 4px 10px rgba(76, 175, 80, 0.25)',
                    mr: 2
                  }}>
                    <DeviceThermostatIcon sx={{ color: '#fff' }} />
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600, 
                      color: isDarkMode ? '#fff' : theme.palette.text.primary
                    }}
                  >
                    Nhiệt độ & Độ ẩm
                  </Typography>
                </Box>
                
                <Box 
                  className="float-animation" 
                  sx={{ 
                    mb: 3,
                    p: 2.5, 
                    backgroundColor: isDarkMode 
                      ? 'rgba(0, 0, 0, 0.25)'
                      : 'rgba(255, 255, 255, 0.65)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(6px)',
                    border: isDarkMode 
                      ? '1px solid rgba(255, 255, 255, 0.05)' 
                      : '1px solid rgba(0, 0, 0, 0.03)',
                    boxShadow: isDarkMode 
                      ? 'inset 0 1px 3px rgba(0, 0, 0, 0.2)' 
                      : 'inset 0 1px 3px rgba(0, 0, 0, 0.05)',
                    textAlign: 'center'
                  }}
                >
                  <Typography 
                    className="sensor-value" 
                    sx={{ 
                      color: isDarkMode 
                        ? '#7bed7b' 
                        : '#2e7d32',
                      fontSize: '3rem',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      letterSpacing: '-0.5px',
                      textShadow: isDarkMode 
                        ? '0 0 15px rgba(76, 175, 80, 0.3)' 
                        : '0 0 10px rgba(76, 175, 80, 0.15)',
                      mb: 1
                    }}
                  >
                    {sensorData?.temperature ?? '--'}°C
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: '0.85rem',
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      fontWeight: 500
                    }}
                  >
                    Nhiệt độ hiện tại
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  p: 2,
                  backgroundColor: isDarkMode 
                    ? 'rgba(76, 175, 80, 0.15)'
                    : 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: isDarkMode 
                      ? 'rgba(76, 175, 80, 0.2)'
                      : 'rgba(76, 175, 80, 0.15)',
                  }
                }}>
                  <Box sx={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: isDarkMode 
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.7)', 
                    color: isDarkMode ? '#7bed7b' : '#2e7d32',
                    mr: 2,
                    boxShadow: isDarkMode 
                      ? '0 3px 5px rgba(0, 0, 0, 0.15)'
                      : '0 3px 5px rgba(0, 0, 0, 0.05)',
                  }}>
                    <OpacityIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 400,
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                        fontSize: '0.85rem',
                        mb: 0.5
                      }}
                    >
                      Độ ẩm môi trường:
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600,
                        color: isDarkMode ? '#fff' : theme.palette.text.primary,
                        fontSize: '1.1rem'
                      }}
                    >
                      {sensorData?.humidity ?? '--'}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Card 
              className="sensor-card" 
              elevation={0}
              sx={{ 
                borderRadius: '18px', 
                height: '100%',
                backgroundColor: isDarkMode
                  ? alpha(theme.palette.background.paper, 0.8)  
                  : alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(10px)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: isDarkMode 
                  ? '0 10px 30px rgba(0, 0, 0, 0.25)' 
                  : '0 10px 30px rgba(0, 0, 0, 0.07)',
                border: isDarkMode 
                  ? '1px solid rgba(255, 255, 255, 0.05)' 
                  : '1px solid rgba(0, 0, 0, 0.03)',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: isDarkMode 
                    ? '0 15px 35px rgba(0, 0, 0, 0.35), 0 0 15px rgba(255, 193, 7, 0.3)' 
                    : '0 15px 35px rgba(0, 0, 0, 0.1), 0 0 15px rgba(255, 193, 7, 0.2)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: isDarkMode 
                    ? 'linear-gradient(90deg, #ffa000, #ffc107)' 
                    : 'linear-gradient(90deg, #ff8f00, #ffb300)',
                  zIndex: 10
                }
              }}
            >
              {/* Decorative elements */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '-15%',
                  left: '-10%',
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: isDarkMode
                    ? 'radial-gradient(circle, rgba(255, 193, 7, 0.15) 0%, rgba(255, 193, 7, 0) 70%)'
                    : 'radial-gradient(circle, rgba(255, 193, 7, 0.1) 0%, rgba(255, 193, 7, 0) 70%)',
                  filter: 'blur(30px)',
                  zIndex: 0,
                }}
              />
              
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 3,
                }}>
                  <Box sx={{ 
                    width: '46px', 
                    height: '46px', 
                    borderRadius: '14px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: isDarkMode 
                      ? 'linear-gradient(45deg, rgba(255, 160, 0, 0.8), rgba(255, 193, 7, 0.9))' 
                      : 'linear-gradient(45deg, rgba(255, 160, 0, 0.9), rgba(255, 193, 7, 1))',
                    boxShadow: '0 4px 10px rgba(255, 193, 7, 0.25)',
                    mr: 2
                  }}>
                    <LightModeIcon sx={{ color: '#fff' }} />
                  </Box>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600, 
                      color: isDarkMode ? '#fff' : theme.palette.text.primary
                    }}
                  >
                    Ánh sáng & Độ ẩm đất
                  </Typography>
                </Box>
                
                <Box 
                  className="float-animation" 
                  sx={{ 
                    mb: 3,
                    p: 2.5, 
                    backgroundColor: isDarkMode 
                      ? 'rgba(0, 0, 0, 0.25)'
                      : 'rgba(255, 255, 255, 0.65)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(6px)',
                    border: isDarkMode 
                      ? '1px solid rgba(255, 255, 255, 0.05)' 
                      : '1px solid rgba(0, 0, 0, 0.03)',
                    boxShadow: isDarkMode 
                      ? 'inset 0 1px 3px rgba(0, 0, 0, 0.2)' 
                      : 'inset 0 1px 3px rgba(0, 0, 0, 0.05)',
                    textAlign: 'center'
                  }}
                >
                  <Typography 
                    className="sensor-value" 
                    sx={{ 
                      color: isDarkMode 
                        ? '#ffc107' 
                        : '#ff8f00',
                      fontSize: '3rem',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      letterSpacing: '-0.5px',
                      textShadow: isDarkMode 
                        ? '0 0 15px rgba(255, 193, 7, 0.3)' 
                        : '0 0 10px rgba(255, 193, 7, 0.15)',
                      mb: 1
                    }}
                  >
                    {sensorData?.light ?? '--'}%
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontSize: '0.85rem',
                      color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      fontWeight: 500
                    }}
                  >
                    Cường độ ánh sáng
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  p: 2,
                  backgroundColor: isDarkMode 
                    ? 'rgba(76, 175, 80, 0.15)'
                    : 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: isDarkMode 
                      ? 'rgba(76, 175, 80, 0.2)'
                      : 'rgba(76, 175, 80, 0.15)',
                  }
                }}>
                  <Box sx={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '10px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: isDarkMode 
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.7)', 
                    color: isDarkMode ? '#7bed7b' : '#2e7d32',
                    mr: 2,
                    boxShadow: isDarkMode 
                      ? '0 3px 5px rgba(0, 0, 0, 0.15)'
                      : '0 3px 5px rgba(0, 0, 0, 0.05)',
                  }}>
                    <GrassIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 400,
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                        fontSize: '0.85rem',
                        mb: 0.5
                      }}
                    >
                      Độ ẩm đất:
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 600,
                        color: isDarkMode ? '#fff' : theme.palette.text.primary,
                        fontSize: '1.1rem'
                      }}
                    >
                      {sensorData?.soil ?? '--'}%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default GardenOverviewTab;