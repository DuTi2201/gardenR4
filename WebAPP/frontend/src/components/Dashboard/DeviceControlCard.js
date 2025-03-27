import React from 'react';
import {
  Grid, Card, CardContent, CardActions, Typography, Box, Button
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

const DeviceControlCard = ({
  title,
  deviceKey,
  icon,
  isOn,
  isAutoMode,
  cooldown,
  onControl,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDarkMode = theme.palette.mode === 'dark';

  const handleTurnOn = () => onControl(deviceKey, true);
  const handleTurnOff = () => onControl(deviceKey, false);

  return (
    <Grid item xs={6} sm={6} md={3}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: '16px',
          boxShadow: isDarkMode 
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)' 
            : '0 10px 25px -5px rgba(76, 175, 80, 0.1), 0 8px 10px -6px rgba(76, 175, 80, 0.1)',
          height: '100%',
          minHeight: { xs: 150, sm: 170 },
          bgcolor: isDarkMode 
            ? 'linear-gradient(145deg, rgba(42, 45, 50, 0.9) 0%, rgba(32, 35, 40, 0.9) 100%)' 
            : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 247, 240, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          borderColor: isDarkMode 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(76, 175, 80, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: { xs: 'none', sm: 'translateY(-5px)' },
            boxShadow: isDarkMode
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
              : '0 20px 25px -5px rgba(76, 175, 80, 0.2), 0 10px 10px -5px rgba(76, 175, 80, 0.15)',
            borderColor: isDarkMode 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(76, 175, 80, 0.2)',
          },
          '&:active': {
            transform: { xs: 'scale(0.98)', sm: 'none' },
            boxShadow: { xs: 'inset 0 2px 8px rgba(0,0,0,0.1)', sm: 'none' },
          },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: isOn 
              ? 'linear-gradient(90deg, #80E27E, #4CAF50)' 
              : isDarkMode 
                ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05))' 
                : 'linear-gradient(90deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.05))',
            opacity: isOn ? 1 : 0.5,
            transition: 'all 0.3s ease',
          }
        }}
      >
        <CardContent sx={{ 
          p: { xs: 1.5, sm: 2, md: 3 }, 
          position: 'relative', 
          zIndex: 1,
          pb: { xs: 1, sm: 1.5 }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1, sm: 1.5 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 0.8, sm: 1, md: 1.5 },
                width: { xs: 32, sm: 38, md: 42 },
                height: { xs: 32, sm: 38, md: 42 },
                borderRadius: '12px',
                mr: { xs: 1, sm: 1.5 },
                backgroundColor: isOn 
                  ? isDarkMode 
                    ? 'rgba(76, 175, 80, 0.25)' 
                    : 'rgba(76, 175, 80, 0.1)' 
                  : isDarkMode 
                    ? 'rgba(255, 255, 255, 0.08)' 
                    : 'rgba(0, 0, 0, 0.04)',
                color: isOn 
                  ? isDarkMode 
                    ? '#80E27E' 
                    : '#2e7d32' 
                  : isDarkMode 
                    ? 'rgba(255, 255, 255, 0.7)' 
                    : 'rgba(0, 0, 0, 0.6)',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                  opacity: 0.5,
                }
              }}
            >
             {React.cloneElement(icon, {
                fontSize: isMobile ? "small" : isTablet ? "medium" : "medium",
                sx: { display: 'block' }
             })}
            </Box>
            <Typography
              variant={isMobile ? "body2" : isTablet ? "subtitle1" : "h6"}
              sx={{ 
                color: isDarkMode ? 'rgba(255, 255, 255, 0.95)' : 'text.primary',
                fontWeight: 600,
                letterSpacing: '0.3px',
                fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.1rem' },
                lineHeight: 1.2
              }}
            >
              {title}
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            position: 'relative',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: '-20px',
              right: '-20px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: isOn 
                ? isDarkMode 
                  ? 'radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0) 70%)' 
                  : 'radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0) 70%)'
                : 'transparent',
              zIndex: 0,
              transition: 'all 0.3s ease',
            }
          }}>
          <Typography
            variant="body2"
              color={isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'text.secondary'}
              sx={{ 
                mb: 0.5,
                display: 'flex',
                alignItems: 'center',
                fontWeight: 500,
                position: 'relative',
                zIndex: 1,
                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.875rem' }
              }}
            >
              Trạng thái: 
              <Typography 
                component="span" 
                fontWeight="bold" 
                ml={0.5} 
                color={isOn 
                  ? isDarkMode ? '#80E27E' : '#2e7d32' 
                  : isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'text.secondary'}
              >
                {isOn ? 'BẬT' : 'TẮT'}
              </Typography>
          </Typography>
          {cooldown > 0 && (
            <Typography
                variant="caption"
                sx={{ 
                  color: isDarkMode ? 'warning.light' : 'warning.main', 
                  display: 'block',
                  fontWeight: 500,
                  position: 'relative',
                  zIndex: 1,
                  fontSize: { xs: '0.7rem', sm: '0.75rem' }
                }}
            >
              Đang chờ: {cooldown}s
            </Typography>
          )}
          </Box>
        </CardContent>
        <CardActions sx={{ 
          p: { xs: 1.5, sm: 2 }, 
          pt: 0, 
          position: 'relative', 
          zIndex: 1 
        }}>
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1, sm: 1.5 }, 
            width: '100%' 
          }}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={isAutoMode || isOn || cooldown > 0}
              onClick={handleTurnOn}
              fullWidth
              sx={{
                borderRadius: '10px',
                py: { xs: 0.5, sm: 0.8 },
                minHeight: { xs: 32, sm: 36 },
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: isAutoMode || isOn || cooldown > 0 ? 'none' : (isDarkMode ? '0 4px 12px rgba(76, 175, 80, 0.2)' : '0 4px 12px rgba(76, 175, 80, 0.2)'),
                transition: 'all 0.2s ease',
                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.85rem' },
                '&:hover': {
                  transform: isAutoMode || isOn || cooldown > 0 ? 'none' : 'translateY(-2px)',
                  boxShadow: isAutoMode || isOn || cooldown > 0 ? 'none' : (isDarkMode ? '0 6px 16px rgba(76, 175, 80, 0.3)' : '0 6px 16px rgba(76, 175, 80, 0.3)'),
                },
                '&:active': {
                  transform: { xs: 'scale(0.98)', sm: 'none' }
                }
              }}
            >
              BẬT
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={isAutoMode || !isOn || cooldown > 0}
              onClick={handleTurnOff}
              fullWidth
              sx={{ 
                borderRadius: '10px',
                py: { xs: 0.5, sm: 0.8 },
                minHeight: { xs: 32, sm: 36 },
                fontWeight: 600,
                textTransform: 'none',
                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.85rem' },
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : undefined, 
                color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : undefined,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: isAutoMode || !isOn || cooldown > 0 ? 'none' : 'translateY(-2px)',
                  boxShadow: isAutoMode || !isOn || cooldown > 0 ? 'none' : (isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.05)'),
                },
                '&:active': {
                  transform: { xs: 'scale(0.98)', sm: 'none' }
                }
              }}
            >
              TẮT
            </Button>
          </Box>
        </CardActions>
      </Card>
    </Grid>
  );
};

export default DeviceControlCard;