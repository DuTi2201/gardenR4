import React from 'react';
import { Grid, Paper, Typography, Box, Skeleton } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

const SensorDataDisplay = ({ title, value, unit, icon, isLoading }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Grid item xs={6} sm={6} md={3}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2, md: 3 },
          height: '100%',
          minHeight: { xs: 120, sm: 140 },
          borderRadius: '16px',
          background: isDarkMode
            ? 'linear-gradient(145deg, rgba(42, 45, 50, 0.9) 0%, rgba(32, 35, 40, 0.9) 100%)'
            : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 247, 240, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          boxShadow: isDarkMode
            ? '0 10px 25px -3px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.3)'
            : '0 10px 25px -5px rgba(76, 175, 80, 0.1), 0 8px 10px -6px rgba(76, 175, 80, 0.1)',
          border: isDarkMode
            ? '1px solid rgba(255, 255, 255, 0.05)'
            : '1px solid rgba(76, 175, 80, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          '&:hover': {
            transform: { xs: 'none', sm: 'translateY(-5px)' },
            boxShadow: isDarkMode
              ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
              : '0 20px 25px -5px rgba(76, 175, 80, 0.2), 0 10px 10px -5px rgba(76, 175, 80, 0.15)',
            border: isDarkMode
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(76, 175, 80, 0.2)',
          },
          position: 'relative',
          overflow: 'hidden',
       
          '&:active': {
            transform: { xs: 'scale(0.98)', sm: 'none' },
            boxShadow: { xs: 'inset 0 2px 8px rgba(0,0,0,0.1)', sm: 'none' },
          }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: { xs: 1, sm: 1.5, md: 2 },
          flexShrink: 0
        }}>
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
              backgroundColor: (theme) => alpha(theme.palette.primary.main, isDarkMode ? 0.2 : 0.1),
              color: 'primary.main',
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
            fontWeight={600}
            color={isDarkMode ? "rgba(255, 255, 255, 0.95)" : "text.primary"}
            sx={{ 
              fontSize: { xs: '0.85rem', sm: '0.95rem', md: '1.1rem' },
              letterSpacing: '0.3px',
              lineHeight: 1.2
            }}
          >
            {title}
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          flexGrow: 1,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-20px',
            right: '-20px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isDarkMode 
              ? 'radial-gradient(circle, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0) 70%)'
              : 'radial-gradient(circle, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0) 70%)',
            zIndex: 0,
          }
        }}>
          {isLoading ? (
            <Skeleton
              animation="wave"
              height={isMobile ? 40 : 60}
              width="80%"
              style={{ margin: '0 auto' }}
            />
          ) : (
            <Typography
              variant={isMobile ? "h5" : isTablet ? "h4" : "h3"}
              sx={{
                fontWeight: 700,
                color: isDarkMode ? '#80E27E' : '#2e7d32',
                textAlign: 'center',
                lineHeight: 1.2,
                fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.2rem', lg: '2.5rem' },
                textShadow: isDarkMode ? '0 0 8px rgba(76, 175, 80, 0.3)' : 'none',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {value !== undefined && value !== null ? value : '--'}
              <Typography
                component="span"
                variant={isMobile ? "caption" : isTablet ? "subtitle1" : "h6"}
                sx={{
                  ml: 0.3,
                  opacity: isDarkMode ? 0.8 : 0.7,
                  fontWeight: 400,
                  fontSize: { xs: '0.7rem', sm: '0.8rem', md: '1rem' }
                }}
              >
                {unit}
              </Typography>
            </Typography>
          )}
        </Box>
      </Paper>
    </Grid>
  );
};

export default SensorDataDisplay;